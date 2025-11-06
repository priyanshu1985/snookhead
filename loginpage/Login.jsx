import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';

// SVG Icons for Social Logins
const GoogleIcon = () => (
  <Svg height="20" width="20" viewBox="0 0 48 48" style={{ marginRight: 12 }}>
    <Path
      fill="#FFC107"
      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
    />
    <Path
      fill="#FF3D00"
      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
    />
    <Path
      fill="#4CAF50"
      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
    />
    <Path
      fill="#1976D2"
      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.999,35.086,44,30.016,44,24C44,22.659,43.862,21.35,43.611,20.083z"
    />
  </Svg>
);

const TwitterIcon = () => (
  <Svg
    height="20"
    width="20"
    fill="#1DA1F2"
    viewBox="0 0 24 24"
    style={{ marginRight: 12 }}
  >
    <Path d="M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.27 0 .34.04.67.11.98-3.56-.18-6.73-1.89-8.84-4.48-.37.63-.58 1.37-.58 2.15 0 1.48.75 2.79 1.9 3.55-.7-.02-1.37-.22-1.95-.5v.03c0 2.07 1.48 3.8 3.44 4.2-.36.1-.74.15-1.14.15-.28 0-.55-.03-.81-.08.54 1.7 2.1 2.94 3.96 2.97-1.47 1.15-3.32 1.83-5.33 1.83-.35 0-.69-.02-1.03-.06 1.9 1.23 4.16 1.95 6.56 1.95 7.88 0 12.2-6.54 12.2-12.2 0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
  </Svg>
);

const FacebookIcon = () => (
  <Svg
    height="20"
    width="20"
    fill="#1877F2"
    viewBox="0 0 24 24"
    style={{ marginRight: 12 }}
  >
    <Path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89H8.078v-2.89h2.36V9.613c0-2.324 1.385-3.593 3.49-3.593.996 0 1.858.074 2.106.107v2.587h-1.528c-1.13 0-1.35.536-1.35 1.325v1.745h2.867l-.372 2.89H15.5V21.88A9.994 9.994 0 0022 12z" />
  </Svg>
);

// Main Application Component
export default function App() {
  // State to manage the UI flow
  const [authMode, setAuthMode] = useState('signIn'); // 'signIn' or 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mock handler for Sign In
  const handleSignIn = () => {
    if (email && password) {
      console.log(`Signing in with Email: ${email}, Password: ${password}`);
      Alert.alert('Success', 'Successfully signed in!');
    } else {
      Alert.alert('Error', 'Please enter your email and password.');
    }
  };

  // Mock handler for Sign Up
  const handleSignUp = () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', "Passwords don't match.");
      return;
    }
    if (email && password) {
      console.log(`Signing up with Email: ${email}, Password: ${password}`);
      Alert.alert('Success', 'Account created successfully!');
    } else {
      Alert.alert('Error', 'Please fill in all fields.');
    }
  };

  // Mock handlers for Social Authentication
  const handleSocialAuth = provider => {
    console.log(`Authenticating with ${provider}`);
    Alert.alert('Info', `Redirecting to ${provider} for authentication...`);
  };

  // Function to reset fields when switching auth mode
  const switchAuthMode = mode => {
    setAuthMode(mode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://placehold.co/1920x1080/000000/FFFFFF?text=Snooker+Lounge',
        }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Snok Head</Text>
              <Text style={styles.subtitle}>
                {authMode === 'signIn'
                  ? 'Welcome Back!'
                  : 'Create Your Account'}
              </Text>
            </View>

            {authMode === 'signIn' ? (
              /* Sign In View */
              <>
                <View style={styles.formSection}>
                  <TextInput
                    style={[styles.input, styles.inputTop]}
                    placeholder="Email or Username"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={[styles.input, styles.inputBottom]}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />

                  <View style={styles.forgotPasswordContainer}>
                    <TouchableOpacity>
                      <Text style={styles.forgotPasswordText}>
                        Forgot your password?
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSignIn}
                  >
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtonsContainer}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialAuth('Google')}
                  >
                    <GoogleIcon />
                    <Text style={styles.socialButtonText}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialAuth('Twitter')}
                  >
                    <TwitterIcon />
                    <Text style={styles.socialButtonText}>
                      Continue with Twitter
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialAuth('Facebook')}
                  >
                    <FacebookIcon />
                    <Text style={styles.socialButtonText}>
                      Continue with Facebook
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.switchModeContainer}>
                  <Text style={styles.switchModeText}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => switchAuthMode('signUp')}>
                    <Text style={styles.switchModeLink}>Create an account</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Sign Up View */
              <>
                <View style={styles.formSection}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSignUp}
                  >
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or sign up with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtonsContainer}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialAuth('Google')}
                  >
                    <GoogleIcon />
                    <Text style={styles.socialButtonText}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialAuth('Twitter')}
                  >
                    <TwitterIcon />
                    <Text style={styles.socialButtonText}>
                      Continue with Twitter
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => handleSocialAuth('Facebook')}
                  >
                    <FacebookIcon />
                    <Text style={styles.socialButtonText}>
                      Continue with Facebook
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.switchModeContainer}>
                  <Text style={styles.switchModeText}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => switchAuthMode('signIn')}>
                    <Text style={styles.switchModeLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  formContainer: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    padding: 32,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 25,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#D1D5DB',
    fontSize: 16,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 24,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    borderRadius: 6,
    marginBottom: 16,
  },
  inputTop: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  inputBottom: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderTopWidth: 0,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#059669',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4B5563',
  },
  dividerText: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    color: '#9CA3AF',
    fontSize: 14,
  },
  socialButtonsContainer: {
    marginBottom: 24,
  },
  socialButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 16,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchModeText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  switchModeLink: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '500',
  },
});
