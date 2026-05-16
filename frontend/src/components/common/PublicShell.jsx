import Footer from '../Footer/Footer';
import Navbar from '../Navbar/Navbar';

/** Khung trang công khai: header + nội dung + footer (dùng cho / và các route trong PublicSite). */
const PublicShell = ({ children }) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <div className="flex-1">{children}</div>
    <Footer />
  </div>
);

export default PublicShell;
