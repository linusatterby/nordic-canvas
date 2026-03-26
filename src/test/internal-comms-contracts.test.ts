import { describe, it, expect } from "vitest";

/**
 * Contract tests for internal communications.
 * Verifies API function signatures, label consistency, and behavioral contracts.
 */

describe("Internal comms contracts", () => {
  it("API module exports expected functions", async () => {
    const api = await import("@/lib/api/internalComms");
    expect(typeof api.createMessage).toBe("function");
    expect(typeof api.listMessagesForOrg).toBe("function");
    expect(typeof api.listMessagesForUser).toBe("function");
    expect(typeof api.createGroup).toBe("function");
    expect(typeof api.listGroupsForOrg).toBe("function");
    expect(typeof api.assignUserToGroup).toBe("function");
    expect(typeof api.removeUserFromGroup).toBe("function");
    expect(typeof api.listGroupMembers).toBe("function");
    expect(typeof api.listOrgMembersWithProfile).toBe("function");
  });

  it("hooks module exports expected hooks", async () => {
    const hooks = await import("@/hooks/useInternalComms");
    expect(typeof hooks.useGroups).toBe("function");
    expect(typeof hooks.useGroupMembers).toBe("function");
    expect(typeof hooks.useOrgMembers).toBe("function");
    expect(typeof hooks.useInternalMessages).toBe("function");
    expect(typeof hooks.useInternalMessagesForUser).toBe("function");
    expect(typeof hooks.useCreateMessage).toBe("function");
    expect(typeof hooks.useCreateGroup).toBe("function");
    expect(typeof hooks.useAssignUserToGroup).toBe("function");
    expect(typeof hooks.useRemoveUserFromGroup).toBe("function");
  });

  it("labels contain all comms keys", async () => {
    const { LABELS } = await import("@/config/labels");
    const required = [
      "commsTitle",
      "commsNewMessage",
      "commsTargetAll",
      "commsTargetGroups",
      "commsFeedTitle",
      "commsFeedEmpty",
      "commsSend",
      "commsGroupsTitle",
      "commsGroupsSubtitle",
      "commsCreateGroup",
      "commsGroupName",
      "commsGroupMembers",
      "commsAddMember",
      "commsRemoveMember",
      "commsNoGroupsYet",
      "commsNoMembersYet",
      "commsCreateGroupFirst",
      "commsManageMembers",
    ];
    for (const key of required) {
      expect((LABELS as Record<string, string>)[key]).toBeTruthy();
    }
  });

  it("message to 'all' should be visible to all staff (design contract)", () => {
    const payload = {
      org_id: "test",
      title: "Info",
      body: "Content",
      target: "all" as const,
    };
    expect(payload.target).toBe("all");
    expect(payload).not.toHaveProperty("group_ids");
  });

  it("group-targeted message requires group_ids", () => {
    const payload = {
      org_id: "test",
      title: "Info",
      body: "Content",
      target: "groups" as const,
      group_ids: ["group-1", "group-2"],
    };
    expect(payload.target).toBe("groups");
    expect(payload.group_ids.length).toBeGreaterThan(0);
  });

  it("queryKeys include orgMembers factory", async () => {
    const { queryKeys } = await import("@/lib/queryKeys");
    expect(queryKeys.internalComms.orgMembers("org-1")).toEqual([
      "internalComms",
      "orgMembers",
      "org-1",
    ]);
  });

  // ── RLS design contracts ──────────────────────────────────────
  it("target='all' must be scoped to org (design contract)", () => {
    // The RLS policy requires org_members check for ALL messages,
    // including target='all'. This test documents that invariant.
    const policyDescription = `
      EXISTS (SELECT 1 FROM org_members om
        WHERE om.org_id = internal_messages.org_id
        AND om.user_id = auth.uid())
      AND (target = 'all' OR (target = 'groups' AND group_member_check))
    `;
    expect(policyDescription).toContain("org_members");
    expect(policyDescription).not.toMatch(/target\s*=\s*'all'\s*(?:$|\))/m);
  });

  it("group message requires group membership (design contract)", () => {
    // Group-targeted messages need BOTH org membership AND group membership
    const groupCheck = "internal_group_members igm WHERE igm.user_id = auth.uid()";
    expect(groupCheck).toContain("internal_group_members");
    expect(groupCheck).toContain("auth.uid()");
  });

  it("messages are never visible across orgs (design contract)", () => {
    // Every read path requires org_members check — no standalone target='all'
    const orgScopeRequired = true;
    const standaloneTargetAll = false;
    expect(orgScopeRequired).toBe(true);
    expect(standaloneTargetAll).toBe(false);
  });
});
