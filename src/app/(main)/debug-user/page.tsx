import { getCachedUser } from "@/lib/auth-cache";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Uses cookies (getCachedUser) — must be dynamic so build does not try to statically render
export const dynamic = "force-dynamic";

export default async function DebugUserPage() {
  const supabaseUser = await getCachedUser();
  
  if (!supabaseUser) {
    redirect("/login");
  }

  // Try to find user in database
  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: supabaseUser.id },
    include: {
      userRoles: {
        include: {
          role: true
        }
      },
      staffRole: true
    }
  });

  // Get all roles
  const allRoles = await prisma.role.findMany();

  // Get all users (just count and a sample)
  const userCount = await prisma.user.count();
  const sampleUsers = await prisma.user.findMany({
    take: 5,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      supabase_id: true,
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">User Debug Page</h1>

      <div className="space-y-6">
        {/* Supabase Auth User */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Supabase Auth User</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>ID:</strong> {supabaseUser.id}</div>
            <div><strong>Email:</strong> {supabaseUser.email}</div>
            <div><strong>Created:</strong> {supabaseUser.created_at}</div>
          </div>
        </div>

        {/* Database User */}
        <div className={`border rounded-lg p-6 ${dbUser ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${dbUser ? 'text-green-900' : 'text-red-900'}`}>
            Database User (public.user)
          </h2>
          {dbUser ? (
            <div className="space-y-2 font-mono text-sm">
              <div><strong>ID:</strong> {dbUser.id}</div>
              <div><strong>Email:</strong> {dbUser.email}</div>
              <div><strong>Name:</strong> {dbUser.firstName} {dbUser.lastName}</div>
              <div><strong>Supabase ID:</strong> {dbUser.supabase_id}</div>
              <div><strong>Roles:</strong> {dbUser.userRoles.map(ur => ur.role.slug).join(", ") || "None"}</div>
              <div><strong>Staff Role:</strong> {dbUser.staffRole?.roleName || "None"}</div>
            </div>
          ) : (
            <div className="text-red-700 font-semibold">
              ❌ User NOT FOUND in database!
              <p className="mt-2 text-sm font-normal">
                The Supabase user exists, but there is no corresponding row in the <code>public.user</code> table
                with <code>supabase_id = {supabaseUser.id}</code>.
              </p>
            </div>
          )}
        </div>

        {/* Available Roles */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Available Roles</h2>
          <div className="space-y-1">
            {allRoles.length > 0 ? (
              allRoles.map(role => (
                <div key={role.id} className="font-mono text-sm">
                  • {role.slug} (ID: {role.id})
                </div>
              ))
            ) : (
              <div className="text-red-600">No roles found in database!</div>
            )}
          </div>
        </div>

        {/* Database Statistics */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Database Statistics</h2>
          <div className="mb-4">
            <strong>Total Users in Database:</strong> {userCount}
          </div>
          <h3 className="font-semibold mb-2">Sample Users:</h3>
          <div className="space-y-3">
            {sampleUsers.map(user => (
              <div key={user.id} className="border-l-4 border-gray-300 pl-3 py-1">
                <div className="font-mono text-sm">
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Supabase ID:</strong> {user.supabase_id}</div>
                  <div><strong>Roles:</strong> {user.userRoles.map(ur => ur.role.slug).join(", ") || "None"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Required */}
        {!dbUser && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-900">⚠️ Action Required</h2>
            <div className="space-y-3 text-sm">
              <p>Your Supabase account exists, but you need a corresponding database record. You have two options:</p>
              
              <div className="ml-4 space-y-2">
                <div>
                  <strong>Option 1: Use User Management (if you have access)</strong>
                  <ol className="list-decimal ml-6 mt-1">
                    <li>Go to User Management page</li>
                    <li>Check for orphaned accounts</li>
                    <li>Link your account and assign the "admin" role</li>
                  </ol>
                </div>

                <div>
                  <strong>Option 2: Run SQL in your database</strong>
                  <pre className="bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto text-xs">
{`-- First, ensure admin role exists
INSERT INTO role (slug) VALUES ('admin') 
ON CONFLICT (slug) DO NOTHING;

-- Create user record
INSERT INTO "user" (
  "firstName", 
  "lastName", 
  "email", 
  "supabase_id"
) VALUES (
  'Your First Name',
  'Your Last Name',
  '${supabaseUser.email}',
  '${supabaseUser.id}'
) RETURNING id;

-- Then assign admin role (replace USER_ID with the id from above)
INSERT INTO user_role ("userId", "roleId")
SELECT '[USER_ID from above]', id FROM role WHERE slug = 'admin';`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
