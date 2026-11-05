"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createContext, useContext, useId, useRef, useState } from "react";

// Glisser-déposer qui marche partout :
// - souris : on clique et on glisse (après 6 px, pour qu'un simple clic reste un clic)
// - doigt : appui long (~1/4 s) puis on glisse ; un balayage rapide fait défiler la page
// - clavier : Espace pour attraper, flèches pour déplacer, Espace pour lâcher

const DragContext = createContext<{ justDropped: () => boolean }>({ justDropped: () => false });

export function SortableGrid({
  ids,
  onMove,
  className,
  children,
}: {
  ids: string[];
  onMove: (from: number, to: number) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const dndId = useId();
  const [active, setActive] = useState(false);
  const droppedAt = useRef(0);

  function onDragEnd({ active, over }: DragEndEvent) {
    setActive(false);
    droppedAt.current = Date.now();
    if (!over || active.id === over.id) return;
    onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  }

  return (
    <DragContext.Provider value={{ justDropped: () => Date.now() - droppedAt.current < 300 }}>
      <DndContext
        // Identifiant stable : sans lui, dnd-kit en génère un différent côté serveur et
        // côté navigateur, et React signale une page incohérente au chargement
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => {
          setActive(true);
          // Petite vibration au décollage sur Android (ignorée ailleurs)
          navigator.vibrate?.(8);
        }}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(false)}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className={`${className ?? ""} ${active ? "admin-dragging" : ""}`}>{children}</div>
        </SortableContext>
      </DndContext>
    </DragContext.Provider>
  );
}

export function SortableItem({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { justDropped } = useContext(DragContext);

  return (
    <div
      // L'élément entier sert de poignée. Le déclarer comme tel permet à dnd-kit d'ignorer
      // la touche Entrée/Espace quand elle vise un bouton à l'intérieur (supprimer, couverture)
      ref={(el) => {
        setNodeRef(el);
        setActivatorNodeRef(el);
      }}
      {...attributes}
      {...listeners}
      aria-roledescription="élément déplaçable"
      aria-label={label}
      // Après un dépôt, le relâchement peut déclencher un clic sur la carte : on l'ignore
      onClickCapture={(e) => {
        if (justDropped()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        // le style en ligne écrase le CSS : on y ajoute l'animation du « soulèvement »
        transition: [transition, "scale 0.2s ease", "box-shadow 0.2s ease"].filter(Boolean).join(", "),
        zIndex: isDragging ? 30 : undefined,
      }}
      className={`admin-sortable relative ${isDragging ? "is-dragging" : ""} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
