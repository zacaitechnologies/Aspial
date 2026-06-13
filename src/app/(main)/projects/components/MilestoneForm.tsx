"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CreateMilestoneData,
  UpdateMilestoneData,
  Milestone,
  taskPriorityOptions,
  milestoneStatusOptions,
} from "../types";
import { createMilestone, updateMilestone, getProjectServices } from "../milestone-actions";
import { addDays, formatDateForDisplay, formatLocalDate, parseLocalDateString } from "@/lib/date-utils";
import {
  DEFAULT_MILESTONE_COLOR,
  MILESTONE_COLOR_OPTIONS,
  MILESTONE_COLOR_VALUES,
} from "@/lib/milestone-colors";
import { cn } from "@/lib/utils";

const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  serviceId: z.string().optional(),
  color: z.enum(MILESTONE_COLOR_VALUES as [string, ...string[]], {
    required_error: "Color is required",
  }),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priority is required",
  }),
  status: z.enum(["not_started", "in_progress", "completed"]),
  startDate: z.string().min(1, "Start date is required"),
  // Deadline = start date + cycle (14 or 28 days) on create.
  cycleDays: z.enum(["14", "28"]),
  // On edit, the deadline may only be extended by 14 or 28 days (0 = keep).
  extendDays: z.enum(["0", "14", "28"]),
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  projectId: number;
  milestone?: Milestone;
  onMilestoneCreated?: (milestone: Milestone) => void;
  onMilestoneUpdated?: (milestone: Milestone) => void;
  trigger?: React.ReactNode;
  onCancel?: () => void;
}

// Reusable form field components
const TitleField = ({ form }: { form: UseFormReturn<MilestoneFormData> }) => (
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

const DescriptionField = ({ form }: { form: UseFormReturn<MilestoneFormData> }) => (
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

const PriorityField = ({ form }: { form: UseFormReturn<MilestoneFormData> }) => (
  <FormField
    control={form.control}
    name="priority"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Priority *</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
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

const StatusField = ({ form }: { form: UseFormReturn<MilestoneFormData> }) => (
  <FormField
    control={form.control}
    name="status"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Status</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
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

const ColorField = ({ form }: { form: UseFormReturn<MilestoneFormData> }) => (
  <FormField
    control={form.control}
    name="color"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Color *</FormLabel>
        <FormControl>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Milestone color"
          >
            {MILESTONE_COLOR_OPTIONS.map((option) => {
              const isSelected = field.value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => field.onChange(option.value)}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 border-border transition-all",
                    option.dotClass,
                    isSelected
                      ? cn("ring-2 ring-offset-2 ring-offset-background", option.selectedRingClass)
                      : "opacity-80 hover:opacity-100"
                  )}
                />
              );
            })}
          </div>
        </FormControl>
        <p className="text-xs text-muted-foreground">
          Pick a color to tell milestones apart on the board.
        </p>
        <FormMessage />
      </FormItem>
    )}
  />
);

const DeadlineFields = ({
  form,
  isEdit = false,
  existingDueDate,
}: {
  form: UseFormReturn<MilestoneFormData>;
  isEdit?: boolean;
  existingDueDate?: Date;
}) => {
  const startDate = form.watch("startDate");
  const cycleDays = form.watch("cycleDays");
  const extendDays = form.watch("extendDays");

  if (isEdit) {
    const base = existingDueDate ? new Date(existingDueDate) : new Date();
    const newDue = addDays(base, parseInt(extendDays || "0", 10));
    return (
      <FormField
        control={form.control}
        name="extendDays"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Extend deadline</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="0">Keep current</SelectItem>
                <SelectItem value="14">+14 days</SelectItem>
                <SelectItem value="28">+28 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Deadline: {formatDateForDisplay(base)}
              {extendDays !== "0" && ` → ${formatDateForDisplay(newDue)}`}. Deadlines can only be
              extended, in 14- or 28-day steps.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  const previewStart = startDate ? parseLocalDateString(startDate) : new Date();
  const due = addDays(previewStart, parseInt(cycleDays || "14", 10));
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start Date *</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="cycleDays"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deadline cycle *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="28">28 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Deadline: {formatDateForDisplay(due)}</p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const ServiceField = ({ form, availableServices, isLoadingServices }: { form: UseFormReturn<MilestoneFormData>; availableServices: Array<{ id: number; name: string; description: string; basePrice: number }>; isLoadingServices: boolean }) => (
  <FormField
    control={form.control}
    name="serviceId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Service (Optional)</FormLabel>
        <Select 
          onValueChange={field.onChange} 
          value={field.value || "none"}
          disabled={isLoadingServices || availableServices.length === 0}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder={
                isLoadingServices 
                  ? "Loading services..." 
                  : availableServices.length === 0 
                    ? "No services available" 
                    : "Select a service"
              } />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {availableServices.map((service) => (
              <SelectItem key={service.id} value={service.id.toString()}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  onCancel,
}: MilestoneFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableServices, setAvailableServices] = useState<Array<{ id: number; name: string; description: string; basePrice: number }>>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: milestone?.title || "",
      description: milestone?.description || "",
      serviceId: milestone?.serviceId?.toString() || "none",
      color: milestone?.color ? (milestone.color as MilestoneFormData["color"]) : DEFAULT_MILESTONE_COLOR,
      priority: milestone?.priority || "low",
      status: milestone?.status || "not_started",
      startDate: milestone?.startDate
        ? formatLocalDate(new Date(milestone.startDate))
        : formatLocalDate(new Date()),
      cycleDays: "14",
      extendDays: "0",
    },
  });

  // Fetch available services when component mounts
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoadingServices(true);
      try {
        const services = await getProjectServices(projectId);
        setAvailableServices(services);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setIsLoadingServices(false);
      }
    };

    fetchServices();
  }, [projectId]);

  const onSubmit = async (data: MilestoneFormData) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    try {
      const { cycleDays, extendDays, startDate: startDateStr, ...rest } = data;
      const startDateObj = startDateStr ? parseLocalDateString(startDateStr) : new Date();
      // Create: deadline = start + chosen cycle. Edit: extend existing due date only.
      const dueDate = milestone
        ? addDays(milestone.dueDate ? new Date(milestone.dueDate) : startDateObj, parseInt(extendDays || "0", 10))
        : addDays(startDateObj, parseInt(cycleDays || "14", 10));

      const milestoneData = {
        ...rest,
        serviceId: rest.serviceId && rest.serviceId !== "none" ? parseInt(rest.serviceId) : null,
        startDate: startDateObj,
        dueDate,
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
      if (process.env.NODE_ENV === "development") {
        console.error("Error saving milestone:", error);
      }
      toast({
        title: "Could not save milestone",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
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
        <ColorField form={form} />

        <ServiceField 
          form={form} 
          availableServices={availableServices}
          isLoadingServices={isLoadingServices}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <PriorityField form={form} />
          <StatusField form={form} />
        </div>
        
        <DeadlineFields
          form={form}
          isEdit={!!milestone}
          existingDueDate={milestone?.dueDate ? new Date(milestone.dueDate) : undefined}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                setIsOpen(false);
              }
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : milestone ? (
              "Update Milestone"
            ) : (
              "Create Milestone"
            )}
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

  // Embedded in a parent dialog (e.g. edit from milestone card) — no nested card/title
  return formContent;
}
