import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { sendMessage } from '../../services/ai';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { hexToRgba } from '../../utils/colorUtils';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
  playlist?: { name: string; tracks: string[] };
}

const WELCOME_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'ai',
    content: '¡Hola! 👋 Soy tu asistente musical con AI. Conozco toda tu biblioteca de canciones.\n\nPuedo ayudarte a:\n• 🎵 Crear playlists personalizadas\n• 🔍 Descubrir música similar\n• 📊 Analizar tus gustos musicales\n• 💡 Recomendarte canciones\n\n¿Qué te gustaría hacer?',
    timestamp: Date.now(),
  },
];

const QUICK_PROMPTS = [
  '🏋️ Playlist para entrenar',
  '🌙 Música para relajarse',
  '🎉 Playlist de fiesta',
  '🎸 Mis mejores canciones',
];

function ChatBubble({ message, index }: { message: Message; index: number }) {
  const isAI = message.role === 'ai';
  const { theme, accentColor, glassOpacity } = useSettingsStore();

  const dynamicAiBubble = theme === 'oled'
    ? `rgba(18, 18, 18, ${glassOpacity * 0.9})`
    : hexToRgba(accentColor, 0.15);

  const dynamicUserBubble = theme === 'oled'
    ? `rgba(30, 30, 30, ${glassOpacity * 0.9})`
    : `rgba(54, 57, 63, 0.85)`;

  const dynamicAiBorder = theme === 'oled'
    ? `rgba(255, 255, 255, 0.08)`
    : hexToRgba(accentColor, 0.3);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={[styles.bubbleRow, !isAI && styles.bubbleRowUser]}
    >
      {isAI && (
        <LinearGradient
          colors={[accentColor, '#EB459E']}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={16} color="#fff" />
        </LinearGradient>
      )}
      <View 
        style={[
          styles.bubble, 
          isAI 
            ? [styles.aiBubble, { backgroundColor: dynamicAiBubble, borderColor: dynamicAiBorder }] 
            : [styles.userBubble, { backgroundColor: dynamicUserBubble }]
        ]}
      >
        <Text style={[styles.bubbleText, !isAI && styles.userBubbleText]}>
          {message.content}
        </Text>
        {message.playlist && (
          <View style={styles.playlistCard}>
            <View style={styles.playlistHeader}>
              <Ionicons name="musical-notes" size={16} color={accentColor} />
              <Text style={styles.playlistName}>{message.playlist.name}</Text>
            </View>
            {message.playlist.tracks.map((track, i) => (
              <Text key={i} style={styles.playlistTrack}>
                {i + 1}. {track}
              </Text>
            ))}
            <TouchableOpacity style={[styles.playPlaylistBtn, { backgroundColor: accentColor }]} activeOpacity={0.7}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.playPlaylistText}>Reproducir playlist</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>(WELCOME_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { songs } = useLibraryStore();
  const { theme, accentColor, glassOpacity, aiProvider, aiApiKey, aiModel } = useSettingsStore();
  const [isTyping, setIsTyping] = useState(false);

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const libraryContext = songs.length > 0 
        ? songs.map(s => `${s.title} - ${s.artist}`).join('\n')
        : 'La biblioteca está vacía actualmente.';
        
      const response = await sendMessage(userText, aiProvider, aiApiKey || 'YOUR_API_KEY_HERE', aiModel, libraryContext);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `Error conectando con la IA: ${e.message}\n\nPor favor, ve a la Configuración y añade tu API Key de ${aiProvider === 'gemini' ? 'Google Gemini' : 'OpenRouter'}.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, aiProvider, aiApiKey, aiModel, songs, isTyping]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: theme === 'oled' ? 'rgba(255,255,255,0.06)' : BORDER }]}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[accentColor, '#EB459E']}
            style={styles.headerIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSubtitle}>{aiProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} · {songs.length} canciones</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.providerBtn, { backgroundColor: dynamicSurface }]} activeOpacity={0.7}>
          <Text style={styles.providerText}>{aiProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} ▾</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, index) => (
          <ChatBubble key={msg.id} message={msg} index={index} />
        ))}
        {isTyping && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.bubbleRow, { marginTop: 8 }]}>
             <View style={[styles.bubble, styles.aiBubble, { backgroundColor: theme === 'oled' ? `rgba(18, 18, 18, ${glassOpacity})` : hexToRgba(accentColor, 0.15), borderColor: theme === 'oled' ? `rgba(255, 255, 255, 0.08)` : hexToRgba(accentColor, 0.3) }]}>
               <ActivityIndicator size="small" color={accentColor} />
             </View>
          </Animated.View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPrompts}
          >
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={[styles.quickPromptChip, { backgroundColor: dynamicSurface }]}
                onPress={() => handleQuickPrompt(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme === 'oled' ? 'rgba(0, 0, 0, 0.92)' : `${dynamicBg}F0`, paddingBottom: Math.max(insets.bottom, 16) + 65, borderTopColor: theme === 'oled' ? 'rgba(255,255,255,0.06)' : BORDER }]}>
          <View style={[styles.inputBar, { backgroundColor: dynamicSurface }]}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={TEXT_MUTED}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              selectionColor={accentColor}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendBtn, input.trim() && { backgroundColor: accentColor }]}
              onPress={handleSend}
              activeOpacity={0.7}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={18} color={input.trim() ? '#fff' : TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  providerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  providerText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 14,
  },
  aiBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 0.5,
  },
  userBubble: {
    borderTopRightRadius: 4,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  bubbleText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    lineHeight: 21,
  },
  userBubbleText: {
    color: TEXT_PRIMARY,
  },
  playlistCard: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  playlistTrack: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 22,
  },
  playPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  playPlaylistText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  quickPrompts: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  quickPromptChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  quickPromptText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    maxHeight: 100,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 84, 92, 0.4)',
  },
});
