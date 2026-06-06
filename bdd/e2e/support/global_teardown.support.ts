import { pruneFixture } from './seed_fixture.support'

export default async function globalTeardown(): Promise<void> {
  await pruneFixture()
}
