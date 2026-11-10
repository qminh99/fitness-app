import HomeScreen from "../../src/features/home/HomeScreen";

export default function HomeRoute() {
  // Replace "there" with the name from your app's user/profile state.
  return <HomeScreen userName="there" dailyGoalMinutes={60} />;
}
