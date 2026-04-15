import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import CartDrawer from "./CartDrawer.jsx";
import ToastViewport from "./ToastViewport.jsx";

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-main">{children}</main>
      <Footer />
      <CartDrawer />
      <ToastViewport />
    </div>
  );
}
