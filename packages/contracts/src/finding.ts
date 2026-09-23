/**
 * One thing a judging found wrong, and what it read to find it out.
 *
 * Every rule a judging holds a reading to is proven the same way: the judging is handed the reading, a fixture hands
 * it one broken in exactly one way, and the codes that come back must be exactly the ones that break names. So each
 * judging declares its codes as a union rather than as a list — nothing ever walks them: a judging names each it
 * finds, and a fixture names the set it expects — and this is the one shape a finding takes, whichever judging made it.
 */
export type Finding<Code extends string> = Readonly<{ code: Code; says: string }>;
