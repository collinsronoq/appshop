export type HouseholdRole = "owner" | "member";

export type HouseholdSummary = {
  id: string;
  name: string;
  role: HouseholdRole;
  member_count: number;
  created_at: string;
};

export type HouseholdDetail = {
  id: string;
  name: string;
  current_user_role: HouseholdRole;
  created_at: string;
  updated_at: string;
};

export type HouseholdMember = {
  user_id: string;
  display_name: string;
  email: string;
  role: HouseholdRole;
  joined_at: string;
};

export type Invitation = {
  id: string;
  invited_email: string;
  status: string;
  expires_at: string;
  invite_token?: string;
  created_at: string;
};
