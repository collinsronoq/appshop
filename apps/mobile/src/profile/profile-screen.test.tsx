import { fireEvent, render, screen } from "@testing-library/react-native";

import ProfileScreen from "../../app/(app)/(tabs)/profile";

const mockPush = jest.fn();
const mockLogout = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { display_name: "Jane Kamau", email: "jane@example.com" }, logout: mockLogout })
}));
jest.mock("../households/household-context", () => ({
  useHouseholds: () => ({ selected: { id: "h1", name: "Kamau Home", role: "owner", member_count: 2 } })
}));

describe("Profile", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps household and account actions reachable", () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByText("Members"));
    fireEvent.press(screen.getByText("Invite member"));
    fireEvent.press(screen.getByText("Switch household"));
    fireEvent.press(screen.getByText("Log out"));

    expect(mockPush).toHaveBeenCalledWith("/members");
    expect(mockPush).toHaveBeenCalledWith("/invite");
    expect(mockPush).toHaveBeenCalledWith("/households");
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
