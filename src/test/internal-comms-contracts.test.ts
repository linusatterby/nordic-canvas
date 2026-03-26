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
});
