import { authApiClient, type AuthClient } from "../auth/api-client";
import type { HouseholdDetail, HouseholdMember, HouseholdSummary, Invitation } from "./types";

export class HouseholdApiClient {
  constructor(private readonly client: AuthClient = authApiClient) {}
  list() { return this.client.authenticatedRequest<HouseholdSummary[]>("/households"); }
  get(id: string) { return this.client.authenticatedRequest<HouseholdDetail>(`/households/${id}`); }
  create(name: string) { return this.client.authenticatedRequest<HouseholdDetail>("/households", { method: "POST", body: JSON.stringify({ name }) }); }
  rename(id: string, name: string) { return this.client.authenticatedRequest<HouseholdDetail>(`/households/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }); }
  members(id: string) { return this.client.authenticatedRequest<HouseholdMember[]>(`/households/${id}/members`); }
  invite(id: string, email: string) { return this.client.authenticatedRequest<Invitation>(`/households/${id}/invitations`, { method: "POST", body: JSON.stringify({ invited_email: email }) }); }
  accept(token: string) { return this.client.authenticatedRequest<HouseholdDetail>(`/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" }); }
}

export const householdApiClient = new HouseholdApiClient();
