import { AgeGroup } from '@prisma/client'

// Строки с дефисом, которые уже использует клиент (types/fitness.ts)
export type ClientAgeGroup = '16-20' | '20-25' | '25-30' | '30-35' | '35-40' | '40+'

export const AGE_GROUP_TO_CLIENT: Record<AgeGroup, ClientAgeGroup> = {
  [AgeGroup.AGE_16_20]: '16-20',
  [AgeGroup.AGE_20_25]: '20-25',
  [AgeGroup.AGE_25_30]: '25-30',
  [AgeGroup.AGE_30_35]: '30-35',
  [AgeGroup.AGE_35_40]: '35-40',
  [AgeGroup.AGE_40_PLUS]: '40+',
}

export const CLIENT_TO_AGE_GROUP: Record<ClientAgeGroup, AgeGroup> = {
  '16-20': AgeGroup.AGE_16_20,
  '20-25': AgeGroup.AGE_20_25,
  '25-30': AgeGroup.AGE_25_30,
  '30-35': AgeGroup.AGE_30_35,
  '35-40': AgeGroup.AGE_35_40,
  '40+': AgeGroup.AGE_40_PLUS,
}

export function toClientAgeGroup(value: AgeGroup): ClientAgeGroup {
  return AGE_GROUP_TO_CLIENT[value]
}

export function toDbAgeGroup(value: string): AgeGroup | null {
  return CLIENT_TO_AGE_GROUP[value as ClientAgeGroup] ?? null
}
