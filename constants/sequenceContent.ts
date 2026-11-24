import type { Sequence, SequenceContentItem } from "./sequenceStorage";

export function getSequenceContent(
  sequence: Pick<Sequence, "exerciseIds" | "content">,
): SequenceContentItem[] {
  return (
    sequence.content ??
    sequence.exerciseIds.map((id) => ({ type: "exercise", id }))
  );
}
