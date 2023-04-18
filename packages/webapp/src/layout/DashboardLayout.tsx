import LeftNavBar, { LeftNavBarItems } from '../components/LeftNavBar';
import TopNavBar from '../components/TopNavBar';

interface DashboardLayoutI {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutI) {
    return (
        <div className="h-full">
            <TopNavBar />
            <div className="flex h-full max-w-6xl">
                <LeftNavBar selectedItem={LeftNavBarItems.Integrations} />
                <div className="ml-60 pt-14 max-w-4xl mx-auto">{children}</div>
            </div>
        </div>
    );
}
