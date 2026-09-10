import { authApiClient, type AuthClient } from "../auth/api-client";
import type { PushTokenRegistration, SubstitutionRequest } from "./types";

export class PushNotificationApiClient {
  constructor(private readonly client: AuthClient = authApiClient) {}

  register(token: string, platform: "ios" | "android", deviceId: string | null = null) {
    return this.client.authenticatedRequest<PushTokenRegistration>("/push-tokens", {
      method: "POST",
      body: JSON.stringify({ provider: "expo", token, platform, device_id: deviceId })
    });
  }

  unregister(id: string) {
    return this.client.authenticatedRequest<void>(`/push-tokens/${id}`, { method: "DELETE" });
  }

  getSubstitution(householdId: string, substitutionId: string) {
    return this.client.authenticatedRequest<SubstitutionRequest>(
      `/households/${householdId}/substitutions/${substitutionId}`
    );
  }

  listPendingSubstitutions(householdId: string) {
    return this.client.authenticatedRequest<SubstitutionRequest[]>(
      `/households/${householdId}/substitutions?status=pending`
    );
  }

  decide(householdId: string, substitutionId: string, decision: "approve" | "reject") {
    return this.client.authenticatedRequest<SubstitutionRequest>(
      `/households/${householdId}/substitutions/${substitutionId}/${decision}`,
      { method: "POST" }
    );
  }

  createRequest(householdId: string, tripId: string, itemId: string, proposal: Record<string, unknown>) {
    return this.client.authenticatedRequest<SubstitutionRequest>(`/households/${householdId}/trips/${tripId}/items/${itemId}/substitutions`, { method: "POST", body: JSON.stringify(proposal) });
  }

  applyPreferred(householdId: string, tripId: string, itemId: string) {
    return this.client.authenticatedRequest(`/households/${householdId}/trips/${tripId}/items/${itemId}/apply-preferred-substitute`, { method: "POST" });
  }
}

export const pushNotificationApi = new PushNotificationApiClient();
