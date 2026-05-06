import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-slate-50 gap-4">
        <Text className="text-4xl">🤔</Text>
        <Text className="text-lg font-semibold text-slate-800">Page not found</Text>
        <Link href="/(app)/groups" className="text-primary underline">
          Go home
        </Link>
      </View>
    </>
  );
}
