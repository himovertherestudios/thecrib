import { redirect } from "next/navigation";
import { getOrgMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { inviteTeammate, revokeInvite } from "../actions";
import type { OrgRole } from "@/lib/database.types";

interface MemberRow {
  id: string;
  role: OrgRole;
  user_id: string;
  profiles: { email: string | null; full_name: string | null } | null;
}

interface InviteRow {
  id: string;
  email: string;
  role: OrgRole;
  created_at: string;
}

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; error?: string }>;
}) {
  const { org: orgParam, error } = await searchParams;
  const orgs = await getOrgMemberships();

  if (orgs.length === 0) redirect("/admin");

  const activeOrg = orgs.find((o) => o.organization_id === orgParam) ?? orgs[0]!;

  const supabase = await createClient();

  const { data: members } = await supabase
    .from("organization_members")
    .select<"id, role, user_id, profiles ( email, full_name )", MemberRow>(
      "id, role, user_id, profiles ( email, full_name )",
    )
    .eq("organization_id", activeOrg.organization_id)
    .order("created_at", { ascending: true });

  const { data: invites } = await supabase
    .from("organization_invites")
    .select<"id, email, role, created_at", InviteRow>("id, email, role, created_at")
    .eq("organization_id", activeOrg.organization_id)
    .is("accepted_at", null)
    .order("created_at", { ascending: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold text-white">Team</h1>

        {orgs.length > 1 ? (
          <form method="get" className="flex items-center gap-2">
            <select
              name="org"
              defaultValue={activeOrg.organization_id}
              className="rounded-xl2 border border-stage-600 bg-stage-850 px-3 py-2 text-sm text-white"
            >
              {orgs.map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.organization_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl2 border border-stage-600 px-3 py-2 text-sm text-stage-300 hover:text-white"
            >
              Switch
            </button>
          </form>
        ) : (
          <p className="text-sm text-stage-400">{activeOrg.organization_name}</p>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Members
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {members && members.length > 0 ? (
              members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3"
                >
                  <div>
                    <p className="text-white">
                      {member.profiles?.full_name || member.profiles?.email || "Unknown"}
                    </p>
                    {member.profiles?.full_name ? (
                      <p className="text-sm text-stage-400">{member.profiles?.email}</p>
                    ) : null}
                  </div>
                  <span className="text-sm capitalize text-stage-400">{member.role}</span>
                </li>
              ))
            ) : (
              <p className="text-sm text-stage-300">No members yet.</p>
            )}
          </ul>

          {invites && invites.length > 0 ? (
            <>
              <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-stage-400">
                Pending invites
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl2 border border-stage-700 bg-stage-850 px-4 py-3"
                  >
                    <div>
                      <p className="text-white">{invite.email}</p>
                      <p className="text-sm capitalize text-stage-400">{invite.role}</p>
                    </div>
                    <form action={revokeInvite}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <input
                        type="hidden"
                        name="organizationId"
                        value={activeOrg.organization_id}
                      />
                      <button
                        type="submit"
                        className="text-sm text-stage-400 hover:text-red-400"
                      >
                        Revoke
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stage-400">
            Invite a teammate
          </h2>
          <form
            action={inviteTeammate}
            className="mt-3 flex flex-col gap-3 rounded-xl2 border border-stage-700 bg-stage-900 p-4"
          >
            <input type="hidden" name="organizationId" value={activeOrg.organization_id} />
            <input
              name="email"
              type="email"
              required
              placeholder="teammate@example.com"
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            />
            <select
              name="role"
              defaultValue="admin"
              className="tap-target rounded-xl2 border border-stage-600 bg-stage-850 px-4 py-3 text-white focus:border-marquee focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
            <Button type="submit" variant="secondary">
              Send invite
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
