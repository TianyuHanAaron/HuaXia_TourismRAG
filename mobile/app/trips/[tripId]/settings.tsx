import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SettingsRedirectRoute() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return <Redirect href={`/trips/${tripId}/(tabs)/settings`} />;
}
