import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/axios';
import { getTicketScanMessage, parseTicketReference } from '../utils/ticketScan';
import Button from './ui/Button';
import Feedback from './ui/Feedback';
import { Surface } from './ui/LayoutPrimitives';

const TicketScanner = () => {
    const videoRef = useRef(null);
    const controlsRef = useRef(null);
    const scanInFlightRef = useRef(false);
    const scannerSessionActiveRef = useRef(false);
    const mountedRef = useRef(false);
    const readerRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const stopScanner = useCallback(() => {
        scannerSessionActiveRef.current = false;
        controlsRef.current?.stop();
        controlsRef.current = null;
        readerRef.current?.reset();
        readerRef.current = null;
        setScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        if (scanning || checking || scannerSessionActiveRef.current || !videoRef.current) return;
        scannerSessionActiveRef.current = true;
        setError('');
        setResult(null);
        let reader;
        try {
            const { BrowserQRCodeReader } = await import('@zxing/browser');
            if (!mountedRef.current || !scannerSessionActiveRef.current) return;
            reader = new BrowserQRCodeReader();
            readerRef.current = reader;
            const controls = await reader.decodeFromVideoDevice(
                undefined,
                videoRef.current,
                (decoded, _decodeError, controls) => {
                    if (!decoded || !mountedRef.current || !scannerSessionActiveRef.current || scanInFlightRef.current) return;
                    scanInFlightRef.current = true;
                    scannerSessionActiveRef.current = false;
                    controls.stop();
                    controlsRef.current = null;
                    setScanning(false);
                    setChecking(true);
                    const ticketReference = parseTicketReference(decoded.getText());
                    if (!ticketReference) {
                        setError(getTicketScanMessage('invalid_ticket_reference'));
                        setChecking(false);
                        scanInFlightRef.current = false;
                        return;
                    }

                    void api.post('/tickets/check-in', { ticketReference })
                        .then(({ data }) => {
                            if (!mountedRef.current) return;
                            setResult({
                                message: getTicketScanMessage(data?.code, data?.message),
                                attendeeName: data?.ticket?.attendeeName,
                                eventTitle: data?.ticket?.eventTitle,
                                checkedInAt: data?.ticket?.checkedInAt,
                                success: data?.code === 'checked_in',
                            });
                        })
                        .catch((requestError) => {
                            if (!mountedRef.current) return;
                            const code = requestError.response?.data?.code;
                            setError(getTicketScanMessage(code, requestError.response?.data?.message || 'Unable to verify this ticket. Check your connection and try again.'));
                        })
                        .finally(() => {
                            if (mountedRef.current) setChecking(false);
                            scanInFlightRef.current = false;
                        });
                },
            );
            if (!mountedRef.current || !scannerSessionActiveRef.current || scanInFlightRef.current) {
                controls.stop();
                reader.reset();
                if (readerRef.current === reader) readerRef.current = null;
                return;
            }
            controlsRef.current = controls;
            setScanning(true);
        } catch (cameraError) {
            scannerSessionActiveRef.current = false;
            if (reader) reader.reset();
            if (readerRef.current === reader) readerRef.current = null;
            if (!mountedRef.current) return;
            setScanning(false);
            if (cameraError?.name === 'NotAllowedError' || cameraError?.name === 'SecurityError') {
                setError('Camera access was denied. Allow camera access in your browser settings and try again.');
            } else if (cameraError?.name === 'NotFoundError' || cameraError?.name === 'NotReadableError') {
                setError('No usable camera was found. Connect a camera or try another device.');
            } else {
                setError('The scanner could not start. Check your browser camera support and try again.');
            }
        }
    }, [checking, scanning]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            scannerSessionActiveRef.current = false;
            controlsRef.current?.stop();
            controlsRef.current = null;
            readerRef.current?.reset();
            readerRef.current = null;
        };
    }, []);

    return (
        <Surface as="section" aria-labelledby="ticket-scanner-heading" className="min-w-0 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div>
                    <p className="mb-1 font-interface text-xs font-bold uppercase tracking-wide text-text-muted">Guest entry</p>
                    <h2 id="ticket-scanner-heading" className="eh-section-title">Ticket check-in</h2>
                    <p className="mt-2 max-w-2xl text-sm text-text-secondary">Scan a guest ticket QR code. EventHub verifies it before recording entry.</p>
                </div>
                <span className={`inline-flex min-h-8 shrink-0 items-center px-3 font-interface text-xs font-bold uppercase tracking-wide ${scanning ? 'bg-success-surface text-success' : checking ? 'bg-info-surface text-info' : 'bg-surface-muted text-text-secondary'}`} role="status">
                    {scanning ? 'Scanner active' : checking ? 'Checking ticket' : 'Scanner stopped'}
                </span>
            </div>

            <div className="grid min-w-0 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
                <div className="min-w-0">
                    <div className="overflow-hidden bg-brand-navy">
                        <video ref={videoRef} className="aspect-video max-h-[min(60vh,42rem)] w-full object-cover" autoPlay muted playsInline aria-label="Ticket QR scanner camera preview" />
                    </div>
                    {checking && <Feedback tone="loading" className="mt-3">Checking ticket with EventHub…</Feedback>}
                    {error && <Feedback tone="error" className="mt-3">{error}</Feedback>}
                    {result && (
                        <Feedback tone={result.success ? 'success' : 'warning'} role={result.success ? 'status' : 'alert'} className="mt-3">
                            <p className="font-bold">{result.message}</p>
                            {result.eventTitle && <p className="mt-1">{result.eventTitle}</p>}
                            {result.attendeeName && <p>Attendee: {result.attendeeName}</p>}
                            {result.checkedInAt && <p>Checked in at {new Date(result.checkedInAt).toLocaleTimeString()}</p>}
                        </Feedback>
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                    <div>
                        <h3 className="font-interface text-sm font-bold text-text-primary">Camera instructions</h3>
                        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
                            <li>Start the scanner and allow camera access when your browser asks.</li>
                            <li>Hold the ticket QR code in view of the camera.</li>
                            <li>Wait for the verification result before scanning another ticket.</li>
                        </ol>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                        {!scanning ? (
                            <Button type="button" onClick={startScanner} disabled={checking} loading={checking} loadingText="Checking ticket…" className="w-full">Start camera scanner</Button>
                        ) : (
                            <Button type="button" variant="outline" onClick={stopScanner} className="w-full">Stop scanner</Button>
                        )}
                        {error && <Button type="button" variant="outline" onClick={() => { setError(''); void startScanner(); }} className="w-full">Try again</Button>}
                    </div>
                </div>
            </div>
        </Surface>
    );
};

export default TicketScanner;
