import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#222121]/10 bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-4 text-4xl font-semibold text-[#222121]">404</div>
        <p className="mb-6 text-sm text-[#222121]/60">Oops! Page not found</p>
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
