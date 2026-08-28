import { AgeGroup } from '@prisma/client'

// Строки с дефисом, которые уже использует клиент (types/fitness.ts)
export type ClientAgeGroup = '16-20' | '21-25' | '26-30' | '31-35' | '36-40' | '41+'

export const AGE_GROUP_TO_CLIENT: Record<AgeGroup, ClientAgeGroup> = {
  [AgeGroup.AGE_16_20]: '16-20',
  [AgeGroup.AGE_21_25]: '21-25',
  [AgeGroup.AGE_26_30]: '26-30',
  [AgeGroup.AGE_31_35]: '31-35',
  [AgeGroup.AGE_36_40]: '36-40',
  [AgeGroup.AGE_41_PLUS]: '41+',
}

export const CLIENT_TO_AGE_GROUP: Record<ClientAgeGroup, AgeGroup> = {
  '16-20': AgeGroup.AGE_16_20,
  '21-25': AgeGroup.AGE_21_25,
  '26-30': AgeGroup.AGE_26_30,
  '31-35': AgeGroup.AGE_31_35,
  '36-40': AgeGroup.AGE_36_40,
  '41+': AgeGroup.AGE_41_PLUS,
}

export function toClientAgeGroup(value: AgeGroup): ClientAgeGroup {
  return AGE_GROUP_TO_CLIENT[value]
}

export function toDbAgeGroup(value: string): AgeGroup | null {
  return CLIENT_TO_AGE_GROUP[value as ClientAgeGroup] ?? null
}
