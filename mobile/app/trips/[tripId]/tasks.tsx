import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TasksRedirectRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <Redirect href={`/trips/${tripId}/(tabs)/tasks`} />;
}
