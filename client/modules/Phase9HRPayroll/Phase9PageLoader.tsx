import React from "react";
interface PageLoaderProps {
  pageId?: string;
}
const Phase9PageLoader: React.FC<PageLoaderProps> = ({
  pageId = "dashboard",
}) => {
  const getContent = () => {
    switch (pageId) {
      case "employees":
        return (
          <div className="w-full h-full flex items-center justify-center bg-background p-6">
            {" "}
            <div className="text-center space-y-4 max-w-md">
              {" "}
              <div className="text-4xl">👨‍💼</div>{" "}
              <h2 className="text-2xl font-bold">Employee Management</h2>{" "}
              <p className="text-muted-foreground">
                {" "}
                Employee profiles, roles, certifications, and contact
                information{" "}
              </p>{" "}
            </div>{" "}
          </div>
        );
      case "scheduling":
        return (
          <div className="w-full h-full flex items-center justify-center bg-background p-6">
            {" "}
            <div className="text-center space-y-4 max-w-md">
              {" "}
              <div className="text-4xl">📅</div>{" "}
              <h2 className="text-2xl font-bold">Scheduling</h2>{" "}
              <p className="text-muted-foreground">
                {" "}
                Create schedules, manage shifts, and optimize labor
                distribution{" "}
              </p>{" "}
            </div>{" "}
          </div>
        );
      case "payroll":
        return (
          <div className="w-full h-full flex items-center justify-center bg-background p-6">
            {" "}
            <div className="text-center space-y-4 max-w-md">
              {" "}
              <div className="text-4xl">💰</div>{" "}
              <h2 className="text-2xl font-bold">Payroll Processing</h2>{" "}
              <p className="text-muted-foreground">
                {" "}
                Calculate, review, and process payroll for all employees{" "}
              </p>{" "}
            </div>{" "}
          </div>
        );
      case "benefits":
        return (
          <div className="w-full h-full flex items-center justify-center bg-background p-6">
            {" "}
            <div className="text-center space-y-4 max-w-md">
              {" "}
              <div className="text-4xl">🏥</div>{" "}
              <h2 className="text-2xl font-bold">Benefits Administration</h2>{" "}
              <p className="text-muted-foreground">
                {" "}
                Manage health, dental, vision, and retirement benefits
                enrollment{" "}
              </p>{" "}
            </div>{" "}
          </div>
        );
      case "training":
        return (
          <div className="w-full h-full flex items-center justify-center bg-background p-6">
            {" "}
            <div className="text-center space-y-4 max-w-md">
              {" "}
              <div className="text-4xl">📚</div>{" "}
              <h2 className="text-2xl font-bold">Training Programs</h2>{" "}
              <p className="text-muted-foreground">
                {" "}
                Create, assign, and track employee training and
                certifications{" "}
              </p>{" "}
            </div>{" "}
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-background p-6">
            {" "}
            <div className="text-center space-y-4 max-w-md">
              {" "}
              <div className="text-4xl">👥</div>{" "}
              <h2 className="text-2xl font-bold">HR & Payroll Dashboard</h2>{" "}
              <p className="text-muted-foreground">
                {" "}
                Workforce metrics, scheduling, and payroll overview{" "}
              </p>{" "}
            </div>{" "}
          </div>
        );
    }
  };
  return getContent();
};
export default Phase9PageLoader;
