import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { setupPlayer, playbackService } from '../services/player';
import { initDatabase } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';

// Registrar el servicio de fondo (CRÍTICO para Android/Expo)
TrackPlayer.registerPlaybackService(() => playbackService);

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Inicializar base de datos y reproductor de fondo
    initDatabase();
    setupPlayer().then((isSetup) => {
      console.log('TrackPlayer setup completed:', isSetup);
      if (isSetup) {
        // Registrar listeners para sincronizar el estado de Zustand
        TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
          const activeTrack = event.track;
          if (activeTrack) {
            const { queue } = usePlayerStore.getState();
            const index = queue.findIndex(t => t.id === activeTrack.id);
            if (index !== -1) {
              usePlayerStore.setState({
                currentTrack: queue[index],
                queueIndex: index,
              });
            } else {
              const newTrack = {
                id: activeTrack.id || '',
                title: activeTrack.title || 'Desconocido',
                artist: activeTrack.artist || 'Desconocido',
                album: activeTrack.album || 'Desconocido',
                duration: activeTrack.duration || 0,
                uri: typeof activeTrack.url === 'string' ? activeTrack.url : '',
                coverUri: typeof activeTrack.artwork === 'string' ? activeTrack.artwork : null,
                playCount: 0,
                addedAt: Date.now()
              };
              usePlayerStore.setState({
                currentTrack: newTrack,
                queueIndex: event.index ?? -1,
              });
            }
          } else {
            usePlayerStore.setState({
              currentTrack: null,
              queueIndex: -1,
            });
          }
        });

        TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
          usePlayerStore.setState({
            isPlaying: event.state === State.Playing
          });
        });
      }
    }).catch(e => console.error('TrackPlayer setup error:', e));
  }, []);


  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121212' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="player/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
