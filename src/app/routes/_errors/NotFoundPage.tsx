import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { EmptyState } from "@/components/delight/EmptyStates";

const NotFoundPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <EmptyState
        type="not-found"
        title="Sidan kunde inte hittas"
        message="Det här är en 404. Sidan du letar efter finns inte eller har tagits bort."
        action={{
          label: "Tillbaka hem",
          onClick: () => navigate("/"),
        }}
        secondaryAction={{
          label: "Gå tillbaka",
          onClick: () => navigate(-1),
        }}
      />
    </div>
  );
};

export default NotFoundPage;
