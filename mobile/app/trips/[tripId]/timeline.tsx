import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TimelineRedirectRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <Redirect href={`/trips/${tripId}/(tabs)/timeline`} />;
}
