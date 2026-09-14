import { fireEvent, render, screen } from "@testing-library/react-native";

import { AppShellProvider, AppTopBar, BackHeader } from "./components";

describe("AppTopBar", () => {
  it("renders the root identity and global actions", () => {
    const onNotifications = jest.fn();
    const onProfile = jest.fn();
    render(<AppTopBar initials="Jane Kamau" onNotifications={onNotifications} onProfile={onProfile} />);

    expect(screen.getByText("AppShop")).toBeTruthy();
    expect(screen.getByText("JK")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open notifications"));
    fireEvent.press(screen.getByLabelText("Open profile"));
    expect(onNotifications).toHaveBeenCalledTimes(1);
    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it("renders nested navigation and replaces the old back header", () => {
    const onBack = jest.fn();
    render(
      <AppShellProvider>
        <AppTopBar initials="JK" onBack={onBack} onNotifications={() => undefined} onProfile={() => undefined} title="Purchase History" variant="nested" />
        <BackHeader title="Duplicate title" onBack={() => undefined} />
      </AppShellProvider>
    );

    expect(screen.getByText("Purchase History")).toBeTruthy();
    expect(screen.queryByText("Duplicate title")).toBeNull();
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
