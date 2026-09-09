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

  decide(householdId: string, substitutionId: string, decision: "approve" | "reject") {
    return this.client.authenticatedRequest<SubstitutionRequest>(
      `/households/${householdId}/substitutions/${substitutionId}/${decision}`,
      { method: "POST" }
    );
  }
}

export const pushNotificationApi = new PushNotificationApiClient();
