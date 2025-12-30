import { redirect } from "next/navigation";
// import { auth } from "@/lib/auth";

/**
 * Home page - Authentication disabled for development
 * 
 * NOTE: Currently redirects directly to projects.
 * Uncomment auth code below when ready to enable authentication.
 */
export default async function HomePage() {
  // Authentication disabled - redirect directly to projects
  redirect("/projects");

  // Uncomment below when ready to enable authentication:
  // const session = await auth();
  // if (session) {
  //   redirect("/projects");
  // } else {
  //   redirect("/login");
  // }
}
