import { ActivityIndicator, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#6C47FF" />
    </View>
  );
}
