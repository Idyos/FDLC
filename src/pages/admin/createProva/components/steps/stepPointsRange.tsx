import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import PointsRangeEditor from "../pointsRangeEditor";

type Props = { challengeType?: string; };
export default function StepPointsRange({ challengeType }: Props) {
  return (
    <FormField name="pointsRange" render={({ field }) => (
      <FormItem id="pointsRange">
        <FormLabel>Rangs de punts:</FormLabel>
        <PointsRangeEditor
          value={field.value ?? []}
          onChange={field.onChange}
          challengeType={challengeType}
        />
        <FormMessage />
      </FormItem>
    )} />
  );
}
