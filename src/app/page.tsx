import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirect authenticated users to the projects page
  redirect("/projects");
}
