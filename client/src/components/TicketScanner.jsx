import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/axios';
import { getTicketScanMessage, parseTicketReference } from '../utils/ticketScan';

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
        <section aria-labelledby="ticket-scanner-heading" className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 id="ticket-scanner-heading" className="text-xl font-bold text-gray-900">Ticket check-in</h2>
            <p className="mt-1 text-sm text-gray-600">Scan a guest ticket QR code. EventHub verifies it before recording entry.</p>
            <div className="mt-4 overflow-hidden rounded-xl bg-gray-950">
                <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline aria-label="Ticket QR scanner camera preview" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
                {!scanning ? (
                    <button type="button" onClick={startScanner} disabled={checking} className="rounded-lg bg-gray-900 px-4 py-2 font-bold text-white disabled:opacity-50">
                        {checking ? 'Checking ticket…' : 'Start camera scanner'}
                    </button>
                ) : (
                    <button type="button" onClick={stopScanner} className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-800">Stop scanner</button>
                )}
                {error && <button type="button" onClick={() => { setError(''); void startScanner(); }} className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-800">Try again</button>}
            </div>
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {result && (
                <div role={result.success ? 'status' : 'alert'} className={`mt-3 rounded-lg p-3 text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>
                    <p className="font-bold">{result.message}</p>
                    {result.eventTitle && <p className="mt-1">{result.eventTitle}</p>}
                    {result.attendeeName && <p>Attendee: {result.attendeeName}</p>}
                    {result.checkedInAt && <p>Checked in at {new Date(result.checkedInAt).toLocaleTimeString()}</p>}
                </div>
            )}
        </section>
    );
};

export default TicketScanner;
