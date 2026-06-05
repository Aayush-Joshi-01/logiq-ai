import * as SecureStore from 'expo-secure-store'
import { BYOK_STORE_KEYS } from '../constants/providers'

export const saveBYOKKey   = (provider, key) => SecureStore.setItemAsync(BYOK_STORE_KEYS[provider], key)
export const getBYOKKey    = (provider)       => SecureStore.getItemAsync(BYOK_STORE_KEYS[provider])
export const clearBYOKKey  = (provider)       => SecureStore.deleteItemAsync(BYOK_STORE_KEYS[provider])

export async function clearAllBYOKKeys() {
  await Promise.all(Object.values(BYOK_STORE_KEYS).map((k) => SecureStore.deleteItemAsync(k)))
}
