export type PushTokenRegistration = {
  id: string;
  provider: "expo";
  platform: "ios" | "android";
  device_id: string | null;
  enabled: boolean;
  last_registered_at: string;
  created_at: string;
};

export type SubstitutionNotificationType =
  | "substitution.requested"
  | "substitution.approved"
  | "substitution.rejected";

export type SubstitutionNotificationData = {
  type: SubstitutionNotificationType;
  household_id: string;
  trip_id: string;
  substitution_id: string;
};

export type SubstitutionRequest = {
  id: string;
  household_id: string;
  shopping_trip_id: string;
  trip_item_id: string;
  requested_by_user_id: string;
  proposed_name: string;
  proposed_brand: string | null;
  proposed_variant: string | null;
  proposed_size_value: number | null;
  proposed_size_unit: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  resolved_by_user_id: string | null;
  resolved_at: string | null;
};
