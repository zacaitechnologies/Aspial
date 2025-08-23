"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CreateMilestoneData,
  UpdateMilestoneData,
  Milestone,
  taskPriorityOptions,
  milestoneStatusOptions,
} from "../types";
import { createMilestone, updateMilestone } from "../milestone-actions";

const milestoneSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["not_started", "in_progress", "completed"]),
  dueDate: z.string().optional(),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  projectId: number;
  milestone?: Milestone;
  onMilestoneCreated?: (milestone: Milestone) => void;
  onMilestoneUpdated?: (milestone: Milestone) => void;
  trigger?: React.ReactNode;
}

// Reusable form field components
const TitleField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="title"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Title *</FormLabel>
        <FormControl>
          <Input placeholder="Enter milestone title" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const DescriptionField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="description"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Enter milestone description"
            className="min-h-[100px]"
            {...field}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const PriorityField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="priority"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Priority</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {taskPriorityOptions.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

const StatusField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="status"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Status</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {milestoneStatusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

const DueDateField = ({ form }: { form: any }) => (
  <FormField
    control={form.control}
    name="dueDate"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Due Date</FormLabel>
        <FormControl>
          <Input
            type="date"
            {...field}
            value={field.value || ""}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export function MilestoneForm({
  projectId,
  milestone,
  onMilestoneCreated,
  onMilestoneUpdated,
  trigger,
}: MilestoneFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: milestone?.title || "",
      description: milestone?.description || "",
      priority: milestone?.priority || "low",
      status: milestone?.status || "not_started",
      dueDate: milestone?.dueDate 
        ? new Date(milestone.dueDate).toISOString().split('T')[0]
        : "",
    },
  });

  const onSubmit = async (data: MilestoneFormData) => {
    setIsSubmitting(true);
    try {
      const milestoneData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };

      if (milestone) {
        // Update existing milestone
        const updatedMilestone = await updateMilestone(milestone.id, milestoneData);
        onMilestoneUpdated?.(updatedMilestone);
      } else {
        // Create new milestone
        const newMilestone = await createMilestone({
          ...milestoneData,
          projectId,
        });
        onMilestoneCreated?.(newMilestone);
      }

      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving milestone:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
    }
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <TitleField form={form} />
        <DescriptionField form={form} />
        
        <div className="grid grid-cols-2 gap-4">
          <PriorityField form={form} />
          <StatusField form={form} />
        </div>
        
        <DueDateField form={form} />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : milestone
              ? "Update Milestone"
              : "Create Milestone"}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {milestone ? "Edit Milestone" : "Create New Milestone"}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {milestone ? "Edit Milestone" : "Create New Milestone"}
        </CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
