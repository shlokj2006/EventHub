import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Container } from '../components/ui/LayoutPrimitives';

const PublicLayout = () => (
    <div className="flex min-h-screen flex-col bg-page text-text-primary">
        <Navbar />
        <Container as="main" className="flex-1 py-8">
            <Outlet />
        </Container>
    </div>
);

export default PublicLayout;
