"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import { PriceInput } from "@/components/ui/price-input";
import {
  venueStep1Schema,
  venueStep2Schema,
  venueStep3Schema,
  type CreateVenueInput,
} from "@/lib/validation/venues.schema";
import { useCreateVenue, useUpdateVenue } from "@/lib/hooks/use-venues";
import type { VenueWithCreator } from "@/lib/data-access/venues.dal";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { VenueMapSelector } from "./VenueMapSelector";
import { VenueImageUpload } from "./VenueImageUpload";
import { useStatesByCountry } from "@/lib/hooks/use-locations";
import { getCountryCoordinates, getStateCoordinates } from "@/lib/utils/country-coordinates";
import { getCountryCode } from "@/lib/utils/country-to-code";
import { MAX_TEXTAREA_LENGTH } from "@/lib/validation/venues.schema";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Home, User, CreditCard, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface VenueFormProps {
  mode: "create" | "edit";
  venue?: VenueWithCreator;
  defaultState: string;
  defaultCountry: string;
  defaultCountryId?: string;
  defaultStateId?: string;
}

type VenueFormData = CreateVenueInput;

// Step indicator component matching the image style (horizontal, no borders)
function StepIndicator({
  currentStep,
  totalSteps,
  onStepClick,
  stepErrors,
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  stepErrors?: Record<number, boolean>;
}) {
  const steps = [
    { number: 1, title: "Basic Information", subtitle: "Venue Details", icon: Home },
    { number: 2, title: "Capacity & Features", subtitle: "Specifications", icon: User },
    { number: 3, title: "Contact & Media", subtitle: "Final Details", icon: CreditCard },
  ];

  return (
    <div className="flex items-center justify-between w-full mb-5">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const hasError = stepErrors?.[step.number] || false;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => onStepClick && onStepClick(step.number)}
              className={cn(
                "flex items-center gap-3 flex-1 cursor-pointer rounded-lg p-2 transition-colors",
                hasError && "bg-rose-100"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div
                  className={cn(
                    "text-sm font-semibold",
                    hasError
                      ? "text-destructive"
                      : isActive
                        ? "text-foreground"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</div>
              </div>
            </button>
            {!isLast && (
              <ChevronRight
                className={cn("mx-5 h-5 w-5 flex-shrink-0", isCompleted ? "text-primary" : "text-muted-foreground")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Character counter component for textareas
function CharacterCounter({ current: currentLength, max: maxLength }: { current: number; max: number }) {
  return (
    <div className="text-xs text-muted-foreground text-right mt-1">
      {currentLength.toLocaleString()}/{maxLength.toLocaleString()}
    </div>
  );
}

export function VenueForm({
  mode,
  venue,
  defaultState,
  defaultCountry,
  defaultCountryId,
  defaultStateId,
}: VenueFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [venueId, setVenueId] = useState<string | undefined>(venue?.id);
  const [selectedStateId, setSelectedStateId] = useState<string | undefined>(defaultStateId);

  // React Query mutations
  const createVenueMutation = useCreateVenue();
  const updateVenueMutation = useUpdateVenue();
  const [uploadedImageFiles, setUploadedImageFiles] = useState<File[]>([]);
  const [availabilityStartDate, setAvailabilityStartDate] = useState<Date | undefined>(
    venue?.availability_start_date ? new Date(venue.availability_start_date) : undefined
  );
  const [availabilityEndDate, setAvailabilityEndDate] = useState<Date | undefined>(
    venue?.availability_end_date ? new Date(venue.availability_end_date) : undefined
  );

  const isEditing = mode === "edit";

  // Get states for the country
  const { data: states = [], isLoading: loadingStates } = useStatesByCountry(defaultCountryId ?? null);

  // Get country center coordinates for map
  const countryCenter = useMemo(() => getCountryCoordinates(defaultCountry), [defaultCountry]);

  // Get state center coordinates for map
  const selectedState = states.find((s) => s.id === selectedStateId);
  const stateCenter = useMemo(() => {
    if (selectedState) {
      return getStateCoordinates(selectedState.name, defaultCountry);
    }
    return undefined;
  }, [selectedState, defaultCountry]);

  // Get country code for phone input
  const phoneDefaultCountry = useMemo(() => getCountryCode(defaultCountry), [defaultCountry]);

  // Initialize form with default values
  const form = useForm<VenueFormData>({
    // Type assertion needed due to zodResolver type inference issue with merged schemas
    resolver: zodResolver(venueStep1Schema.merge(venueStep2Schema).merge(venueStep3Schema)) as any,
    mode: "onSubmit", // Only validate on submit
    reValidateMode: "onChange", // Only re-validate on submit
    shouldFocusError: false, // Don't auto-focus on errors
    defaultValues: venue
      ? {
          name: venue.name,
          street: venue.street || venue.address || "",
          city: venue.city,
          state: venue.state || defaultState || null,
          country: venue.country || defaultCountry,
          location_lat: venue.location_lat ?? undefined,
          location_lng: venue.location_lng ?? undefined,
          capacity_standing: venue.capacity_standing ?? undefined,
          capacity_seated: venue.capacity_seated ?? undefined,
          available_rooms_halls: venue.available_rooms_halls ?? undefined,
          technical_specs: venue.technical_specs
            ? {
                sound: venue.technical_specs.sound ?? false,
                lights: venue.technical_specs.lights ?? false,
                screens: venue.technical_specs.screens ?? false,
              }
            : undefined,
          availability_start_date: venue.availability_start_date
            ? format(new Date(venue.availability_start_date), "yyyy-MM-dd")
            : undefined,
          availability_end_date: venue.availability_end_date
            ? format(new Date(venue.availability_end_date), "yyyy-MM-dd")
            : undefined,
          base_pricing: venue.base_pricing ?? undefined,
          contact_person_name: venue.contact_person_name || "",
          contact_email: venue.contact_email ?? undefined,
          contact_phone: venue.contact_phone ?? undefined,
          restrictions: venue.restrictions ?? undefined,
          images: venue.images || [],
        }
      : {
          state: defaultState || null,
          country: defaultCountry,
          technical_specs: {
            sound: false,
            lights: false,
            screens: false,
          },
          images: [],
        },
  });

  // Update state when stateId changes
  useEffect(() => {
    if (selectedStateId && states.length > 0) {
      const selectedState = states.find((s) => s.id === selectedStateId);
      if (selectedState) {
        form.setValue("state", selectedState.name);
      }
    }
  }, [selectedStateId, states, form]);

  // Calculate step errors for visual feedback (only after submission)
  // Since validation only happens on onSubmit, errors only exist after form submission
  const stepErrors = useMemo(() => {
    // Only calculate errors if form has been submitted (when validation occurs)
    if (!form.formState.isSubmitted) {
      return {};
    }

    const errors: Record<number, boolean> = {};

    // Check step 1
    const step1Fields: (keyof VenueFormData)[] = ["name", "street", "city", "country"];
    errors[1] = step1Fields.some((field) => !!form.formState.errors[field]);

    // Check step 2
    const step2Fields: (keyof VenueFormData)[] = [
      "capacity_standing",
      "capacity_seated",
      "availability_start_date",
      "availability_end_date",
      "base_pricing",
    ];
    errors[2] = step2Fields.some((field) => !!form.formState.errors[field]);

    // Check step 3
    const step3Fields: (keyof VenueFormData)[] = ["contact_person_name", "contact_email", "contact_phone"];
    errors[3] = step3Fields.some((field) => !!form.formState.errors[field]);

    return errors;
  }, [form.formState.errors, form.formState.isSubmitted]);

  // Validate current step
  const validateStep = async (step: number): Promise<boolean> => {
    let schema: typeof venueStep1Schema | typeof venueStep2Schema | typeof venueStep3Schema;
    switch (step) {
      case 1:
        schema = venueStep1Schema;
        break;
      case 2:
        schema = venueStep2Schema;
        break;
      case 3:
        schema = venueStep3Schema;
        break;
      default:
        return true;
    }

    // Trigger validation for all fields in the current step
    const stepFields: (keyof VenueFormData)[] = [];
    if (step === 1) {
      stepFields.push("name", "street", "city", "country", "state", "location_lat", "location_lng");
    } else if (step === 2) {
      stepFields.push(
        "capacity_standing",
        "capacity_seated",
        "available_rooms_halls",
        "technical_specs",
        "availability_start_date",
        "availability_end_date",
        "base_pricing"
      );
    } else if (step === 3) {
      stepFields.push("contact_person_name", "contact_email", "contact_phone", "restrictions", "images");
    }

    // Trigger validation for step fields
    const validationResults = await Promise.all(stepFields.map((field) => form.trigger(field)));

    // Also validate with schema
    const values = form.getValues();
    const result = schema.safeParse(values);

    if (!result.success) {
      // Set errors for the current step
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof VenueFormData;
        form.setError(field, { message: issue.message, type: "validation" });
      });
      return false;
    }

    // Check if any field validation failed
    if (validationResults.some((valid) => !valid)) {
      return false;
    }

    return true;
  };

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Prevent double-click by checking if already on last step
    setCurrentStep((prev) => {
      if (prev >= 3) return prev;
      const nextStep = Math.min(prev + 1, 3);
      // Scroll to top when moving to next step
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return nextStep;
    });
  };

  const handleStepClick = (step: number) => {
    // Allow free navigation to any step - no validation
    setCurrentStep(step);
    // Scroll to top when changing steps
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const handlePrevious = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCurrentStep((prev) => {
      const prevStep = Math.max(prev - 1, 1);
      // Scroll to top when going to previous step
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      return prevStep;
    });
  };

  const onSubmit = async (data: VenueFormData): Promise<void> => {
    // Validate all steps before submission
    // Only submit if we're on the final step
    if (currentStep !== 3) {
      return;
    }

    const step1Valid = await validateStep(1);
    const step2Valid = await validateStep(2);
    const step3Valid = await validateStep(3);

    if (!step1Valid || !step2Valid || !step3Valid) {
      // Find the first step with errors and navigate to it
      if (!step1Valid) {
        setCurrentStep(1);
        toast.error("Please fix errors in Step 1 before submitting");
      } else if (!step2Valid) {
        setCurrentStep(2);
        toast.error("Please fix errors in Step 2 before submitting");
      } else if (!step3Valid) {
        setCurrentStep(3);
        toast.error("Please fix errors in Step 3 before submitting");
      }
      return;
    }

    // Images are already uploaded via API, so we can use them directly
    const submitData = {
      ...data,
      images: data.images || [], // Use uploaded image URLs
    };

    try {
      if (isEditing && venueId) {
        await updateVenueMutation.mutateAsync({ id: venueId, input: submitData });
        router.push("/dashboard/venues");
      } else {
        const result = await createVenueMutation.mutateAsync(submitData);
        if (result.isDuplicate) {
          toast.warning("Duplicate venue detected", {
            description:
              "A venue with the same name, address, and city already exists. Please check if you want to create a duplicate.",
          });
        } else {
          const newVenue = result.venue;
          setVenueId(newVenue.id);
          // Use short_id if available, otherwise fallback to UUID
          const shortId = newVenue.short_id;
          if (shortId) {
            router.push(`/dashboard/venues/${shortId}/edit`);
          } else {
            router.push(`/dashboard/venues/${newVenue.id}/edit`);
          }
        }
      }
    } catch (error) {
      // Error is handled by the mutation hook (toast shown)
      // Just need to handle duplicate case
      if (error && typeof error === "object" && "isDuplicate" in error) {
        // Already handled above
      }
    }
  };

  const handleAddressChange = (
    address: string,
    lat: number | null,
    lng: number | null,
    city?: string,
    region?: string,
    country?: string
  ) => {
    form.setValue("street", address);
    if (lat !== null && lng !== null) {
      form.setValue("location_lat", lat);
      form.setValue("location_lng", lng);
    }
    if (city) {
      form.setValue("city", city);
    }
    if (region) {
      form.setValue("state", region);
      // Try to find matching state in the list
      const matchingState = states.find((s) => s.name.toLowerCase().includes(region.toLowerCase()));
      if (matchingState) {
        setSelectedStateId(matchingState.id);
      }
    }
    // Don't update country - it's locked
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    form.setValue("location_lat", lat);
    form.setValue("location_lng", lng);
  };

  // Get today's date and max date (1 year from now)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setAvailabilityStartDate(date);
    if (date) {
      form.setValue("availability_start_date", format(date, "yyyy-MM-dd"));
      // If end date is before new start date, clear it
      if (availabilityEndDate && date > availabilityEndDate) {
        setAvailabilityEndDate(undefined);
        form.setValue("availability_end_date", undefined);
      }
    } else {
      form.setValue("availability_start_date", undefined);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setAvailabilityEndDate(date);
    if (date) {
      form.setValue("availability_end_date", format(date, "yyyy-MM-dd"));
    } else {
      form.setValue("availability_end_date", undefined);
    }
  };

  // Calculate max end date (1 year from start or maxDate)
  const maxEndDate = useMemo(() => {
    if (availabilityStartDate) {
      const oneYearFromStart = new Date(availabilityStartDate);
      oneYearFromStart.setFullYear(oneYearFromStart.getFullYear() + 1);
      return oneYearFromStart < maxDate ? oneYearFromStart : maxDate;
    }
    return maxDate;
  }, [availabilityStartDate, maxDate]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit as Parameters<typeof form.handleSubmit>[0])} className="space-y-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={3} onStepClick={handleStepClick} stepErrors={stepErrors} />

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Venue Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Venue Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Conference Center"
                  aria-invalid={!!form.formState.errors.name}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              {/* Country - Locked */}
              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="country"
                  {...form.register("country")}
                  value={defaultCountry}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  aria-invalid={!!form.formState.errors.country}
                />
                {form.formState.errors.country && (
                  <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                )}
              </div>

              {/* State - Using LocationCombobox */}
              <div className="space-y-2">
                <LocationCombobox
                  value={selectedStateId}
                  onValueChange={(value) => {
                    setSelectedStateId(value);
                    if (value) {
                      const selectedState = states.find((s) => s.id === value);
                      if (selectedState) {
                        form.setValue("state", selectedState.name);
                      }
                    } else {
                      form.setValue("state", null);
                    }
                  }}
                  options={states.map((s) => ({ id: s.id, name: s.name }))}
                  placeholder="Select state"
                  disabled={!defaultCountryId || loadingStates}
                  loading={loadingStates}
                  label="State"
                  error={form.formState.errors.state?.message}
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder="San Francisco"
                  aria-invalid={!!form.formState.errors.city}
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                )}
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-2">
              <Label htmlFor="street">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <AddressAutocomplete
                id="street"
                value={form.watch("street") || ""}
                onChange={handleAddressChange}
                placeholder="Enter street address (autocomplete enabled)"
                error={form.formState.errors.street?.message}
              />
            </div>

            {/* Map Selector */}
            <VenueMapSelector
              lat={form.watch("location_lat") ?? null}
              lng={form.watch("location_lng") ?? null}
              onLocationSelect={handleLocationSelect}
              countryCenter={countryCenter}
              stateCenter={stateCenter}
              error={form.formState.errors.location_lat?.message || form.formState.errors.location_lng?.message}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Capacity & Features */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="space-y-4">
            {/* Capacity Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity_standing">Standing Capacity</Label>
                <Input
                  id="capacity_standing"
                  type="number"
                  min="0"
                  max="99999999"
                  {...form.register("capacity_standing", { valueAsNumber: true })}
                  placeholder="0"
                  aria-invalid={!!form.formState.errors.capacity_standing}
                />
                {form.formState.errors.capacity_standing && (
                  <p className="text-sm text-destructive">{form.formState.errors.capacity_standing.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity_seated">Seated Capacity</Label>
                <Input
                  id="capacity_seated"
                  type="number"
                  min="0"
                  max="99999999"
                  {...form.register("capacity_seated", { valueAsNumber: true })}
                  placeholder="0"
                  aria-invalid={!!form.formState.errors.capacity_seated}
                />
                {form.formState.errors.capacity_seated && (
                  <p className="text-sm text-destructive">{form.formState.errors.capacity_seated.message}</p>
                )}
              </div>
            </div>

            {/* Available Rooms/Halls */}
            <div className="space-y-2">
              <Label htmlFor="available_rooms_halls">Available Rooms / Halls</Label>
              <textarea
                id="available_rooms_halls"
                {...form.register("available_rooms_halls")}
                maxLength={MAX_TEXTAREA_LENGTH}
                placeholder="Main Hall, Conference Room A, Conference Room B..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!form.formState.errors.available_rooms_halls}
              />
              <CharacterCounter
                current={(form.watch("available_rooms_halls") || "").length}
                max={MAX_TEXTAREA_LENGTH}
              />
              {form.formState.errors.available_rooms_halls && (
                <p className="text-sm text-destructive">{form.formState.errors.available_rooms_halls.message}</p>
              )}
            </div>

            {/* Technical Specs */}
            <div className="space-y-2">
              <Label>Technical Specs</Label>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sound"
                    checked={form.watch("technical_specs")?.sound || false}
                    onCheckedChange={(checked) => {
                      form.setValue("technical_specs", {
                        ...form.watch("technical_specs"),
                        sound: checked === true,
                      });
                    }}
                  />
                  <Label htmlFor="sound" className="font-normal cursor-pointer">
                    Sound
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="lights"
                    checked={form.watch("technical_specs")?.lights || false}
                    onCheckedChange={(checked) => {
                      form.setValue("technical_specs", {
                        ...form.watch("technical_specs"),
                        lights: checked === true,
                      });
                    }}
                  />
                  <Label htmlFor="lights" className="font-normal cursor-pointer">
                    Lights
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="screens"
                    checked={form.watch("technical_specs")?.screens || false}
                    onCheckedChange={(checked) => {
                      form.setValue("technical_specs", {
                        ...form.watch("technical_specs"),
                        screens: checked === true,
                      });
                    }}
                  />
                  <Label htmlFor="screens" className="font-normal cursor-pointer">
                    Screens
                  </Label>
                </div>
              </div>
            </div>

            {/* Availability Dates - Editable Calendar */}
            <div className="grid grid-cols-2 gap-4">
              <DateInput
                value={availabilityStartDate}
                onChange={handleStartDateChange}
                min={today}
                max={maxDate}
                placeholder="Pick a date"
                label="Availability Start Date"
                error={form.formState.errors.availability_start_date?.message}
              />

              <DateInput
                value={availabilityEndDate}
                onChange={handleEndDateChange}
                min={availabilityStartDate || today}
                max={maxEndDate}
                placeholder="Pick a date"
                label="Availability End Date"
                error={form.formState.errors.availability_end_date?.message}
                disabled={!availabilityStartDate}
              />
            </div>

            {/* Base Pricing with thousand separator formatting */}
            <div className="space-y-2">
              <Label htmlFor="base_pricing">Base Pricing</Label>
              <PriceInput
                id="base_pricing"
                value={form.watch("base_pricing")}
                onChange={(value) => form.setValue("base_pricing", value, { shouldValidate: false })}
                placeholder="0.00"
                aria-invalid={!!form.formState.errors.base_pricing}
              />
              {form.formState.errors.base_pricing && (
                <p className="text-sm text-destructive">{form.formState.errors.base_pricing.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Contact & Media */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="space-y-4">
            {/* Contact Person Name */}
            <div className="space-y-2">
              <Label htmlFor="contact_person_name">
                Contact Person Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_person_name"
                {...form.register("contact_person_name")}
                placeholder="John Doe"
                aria-invalid={!!form.formState.errors.contact_person_name}
              />
              {form.formState.errors.contact_person_name && (
                <p className="text-sm text-destructive">{form.formState.errors.contact_person_name.message}</p>
              )}
            </div>

            {/* Contact Email and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  {...form.register("contact_email")}
                  placeholder="contact@venue.com"
                  aria-invalid={!!form.formState.errors.contact_email}
                />
                {form.formState.errors.contact_email && (
                  <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <PhoneInput
                  id="contact_phone"
                  value={form.watch("contact_phone") || undefined}
                  onChange={(value) => form.setValue("contact_phone", value && value.trim() ? value : null)}
                  placeholder="Enter phone number"
                  defaultCountry={phoneDefaultCountry as "US" | "CA" | "GB" | undefined}
                  className="w-full"
                />
                {form.formState.errors.contact_phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.contact_phone.message}</p>
                )}
              </div>
            </div>

            {/* Restrictions with character counter */}
            <div className="space-y-2">
              <Label htmlFor="restrictions">Restrictions</Label>
              <textarea
                id="restrictions"
                {...form.register("restrictions")}
                maxLength={MAX_TEXTAREA_LENGTH}
                placeholder="Noise restrictions, time limits, catering rules..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!form.formState.errors.restrictions}
              />
              <CharacterCounter current={(form.watch("restrictions") || "").length} max={MAX_TEXTAREA_LENGTH} />
              {form.formState.errors.restrictions && (
                <p className="text-sm text-destructive">{form.formState.errors.restrictions.message}</p>
              )}
            </div>

            {/* Image Upload */}
            <VenueImageUpload
              images={form.watch("images") || []}
              onImagesChange={(images) => form.setValue("images", images)}
              venueId={venueId}
              error={form.formState.errors.images?.message}
              onFilesChange={setUploadedImageFiles}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handlePrevious(e)}
              disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={(e) => handleNext(e)}
              disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={createVenueMutation.isPending || updateVenueMutation.isPending}>
              {createVenueMutation.isPending || updateVenueMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Venue"
              ) : (
                "Create Venue"
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
