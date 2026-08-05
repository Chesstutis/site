import { Menu as DropdownMenuPrimitive } from "@base-ui/react/menu";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(
    props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
    return (
        <DropdownMenuPrimitive.Trigger
            data-slot="dropdown-menu-trigger"
            {...props}
        />
    );
}

type DropdownMenuContentProps = ComponentProps<
    typeof DropdownMenuPrimitive.Popup
> &
    Pick<
        ComponentProps<typeof DropdownMenuPrimitive.Positioner>,
        "align" | "alignOffset" | "side" | "sideOffset"
    >;

function DropdownMenuContent({
    align = "end",
    alignOffset,
    className,
    side = "bottom",
    sideOffset = 8,
    ...props
}: DropdownMenuContentProps) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                className="outline-none"
                side={side}
                sideOffset={sideOffset}
            >
                <DropdownMenuPrimitive.Popup
                    data-slot="dropdown-menu-content"
                    className={cn(
                        "max-h-[var(--available-height)] min-w-44 origin-[var(--transform-origin)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
                        className,
                    )}
                    {...props}
                />
            </DropdownMenuPrimitive.Positioner>
        </DropdownMenuPrimitive.Portal>
    );
}

function DropdownMenuGroup(
    props: ComponentProps<typeof DropdownMenuPrimitive.Group>,
) {
    return (
        <DropdownMenuPrimitive.Group
            data-slot="dropdown-menu-group"
            {...props}
        />
    );
}

function DropdownMenuLabel({
    className,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.GroupLabel>) {
    return (
        <DropdownMenuPrimitive.GroupLabel
            data-slot="dropdown-menu-label"
            className={cn(
                "px-2 py-1.5 text-xs font-medium text-muted-foreground",
                className,
            )}
            {...props}
        />
    );
}

function DropdownMenuItem({
    className,
    ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            className={cn(
                "flex cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
};
