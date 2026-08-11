import type { MemberId } from '@/domain'

/** Base error for the fairness explanation module. */
export class FairnessExplanationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FairnessExplanationError'
  }
}

/** The requested member has no balance in the given `SettlementResult` — usually a mismatched household/session. */
export class MemberNotInSettlementError extends FairnessExplanationError {
  constructor(public readonly memberId: MemberId) {
    super(`Member "${memberId}" has no balance in this settlement result.`)
    this.name = 'MemberNotInSettlementError'
  }
}
