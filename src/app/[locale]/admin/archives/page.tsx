'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFormModal } from '@/hooks/useFormModal';
import {
  adminArchivesApi,
  type NiloType,
  type ProcessStep,
  type Artist,
  type CreateNiloTypeData,
  type CreateProcessStepData,
  type CreateArtistData,
} from '@/lib/api';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import FormInput from '@/components/ui/FormInput';
import Modal from '@/components/ui/Modal';
import { AdminTable } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import ProductImageUploader from '@/components/admin/ProductImageUploader';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Tab = 'nilo' | 'process' | 'artist';

// ===== Sortable NiloType Row =====
interface SortableNiloTypeRowProps {
  item: NiloType;
  onEdit: (n: NiloType) => void;
  onDelete: (n: NiloType) => void;
}

function SortableNiloTypeRow({ item, onEdit, onDelete }: SortableNiloTypeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
      <td className="py-3 px-4">
        <span className="inline-block w-6 h-6 rounded" style={{ backgroundColor: item.color }} />
      </td>
      <td className="py-3 px-4 font-medium">{item.nameKo}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.name}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{item.region}</td>
      <td className="py-3 px-4">
        <StatusBadge isActive={item.isActive} />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="rounded border px-2 py-1 text-xs hover:bg-secondary">수정</button>
          <button onClick={() => onDelete(item)} className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">삭제</button>
        </div>
      </td>
    </tr>
  );
}

// ===== Sortable Artist Row =====
interface SortableArtistRowProps {
  item: Artist;
  onEdit: (a: Artist) => void;
  onDelete: (a: Artist) => void;
}

function SortableArtistRow({ item, onEdit, onDelete }: SortableArtistRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
      <td className="py-3 px-4">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded object-cover" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
            {item.name.slice(0, 1)}
          </div>
        )}
      </td>
      <td className="py-3 px-4 font-medium">{item.name}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.title}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.region}</td>
      <td className="py-3 px-4">
        <StatusBadge isActive={item.isActive} />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="rounded border px-2 py-1 text-xs hover:bg-secondary">수정</button>
          <button onClick={() => onDelete(item)} className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">삭제</button>
        </div>
      </td>
    </tr>
  );
}

// ===== ProcessStep Row (no drag) =====
function ProcessStepRow({ item, onEdit, onDelete }: { item: ProcessStep; onEdit: (p: ProcessStep) => void; onDelete: (p: ProcessStep) => void }) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold">
          {item.step}
        </span>
      </td>
      <td className="py-3 px-4 font-medium">{item.title}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="rounded border px-2 py-1 text-xs hover:bg-secondary">수정</button>
          <button onClick={() => onDelete(item)} className="rounded border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">삭제</button>
        </div>
      </td>
    </tr>
  );
}

const NILO_DEFAULTS: CreateNiloTypeData = {
  name: '',
  nameKo: '',
  color: '#8B4513',
  region: '',
  description: '',
  characteristics: [],
  productUrl: '',
  isActive: true,
};

function toNiloFormData(n: NiloType): CreateNiloTypeData {
  return {
    name: n.name,
    nameKo: n.nameKo,
    color: n.color,
    region: n.region,
    description: n.description,
    characteristics: n.characteristics,
    productUrl: n.productUrl,
    isActive: n.isActive,
  };
}

function NiloTypeFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateNiloTypeData) => Promise<void>;
  initial?: NiloType | null;
}) {
  const initialFormData = useMemo(() => (initial ? toNiloFormData(initial) : null), [initial]);
  const { formData: form, setFormData: setForm, loading, handleSubmit } = useFormModal<CreateNiloTypeData>(
    NILO_DEFAULTS,
    initialFormData,
    open,
  );
  const [characteristicsText, setCharacteristicsText] = useState('');

  useEffect(() => {
    if (initial) {
      setCharacteristicsText(initial.characteristics.join(', '));
    } else {
      setCharacteristicsText('');
    }
  }, [initial, open]);

  const handleFormSubmit = async (data: CreateNiloTypeData) => {
    const merged = { ...data, characteristics: characteristicsText.split(',').map((s) => s.trim()).filter(Boolean) };
    await onSubmit(merged);
  };

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '니로타입 수정' : '니로타입 추가'}</h2>
      <form onSubmit={(e) => handleSubmit(e, handleFormSubmit, onClose)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="이름 (中文)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="朱泥" required />
          <FormInput label="이름 (한글)" value={form.nameKo} onChange={(e) => setForm({ ...form, nameKo: e.target.value })} placeholder="주니" required />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">색상</label>
          <div className="flex gap-2">
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded border border-input cursor-pointer" />
            <FormInput value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
          </div>
        </div>
        <FormInput label="산지" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="장쑤성 이싱 황룡산" required />
        <div>
          <label className="text-sm font-medium block mb-1">설명</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" required />
        </div>
        <FormInput label="특성 (쉼표로 구분)" value={characteristicsText} onChange={(e) => setCharacteristicsText(e.target.value)} placeholder="철분 함량 14-16%, 소성 온도 1080-1120°C" />
        <FormInput label="상품 URL" value={form.productUrl} onChange={(e) => setForm({ ...form, productUrl: e.target.value })} placeholder="/products?attrs=clay_type:zhuni" required />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="niloIsActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
          <label htmlFor="niloIsActive" className="text-sm">활성 상태</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : initial ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const PROCESS_DEFAULTS: CreateProcessStepData = {
  step: 1,
  title: '',
  description: '',
  detail: '',
};

function toProcessFormData(p: ProcessStep): CreateProcessStepData {
  return { step: p.step, title: p.title, description: p.description, detail: p.detail };
}

function ProcessStepFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProcessStepData) => Promise<void>;
  initial?: ProcessStep | null;
}) {
  const initialFormData = useMemo(() => (initial ? toProcessFormData(initial) : null), [initial]);
  const { formData: form, setFormData: setForm, loading, handleSubmit } = useFormModal<CreateProcessStepData>(
    PROCESS_DEFAULTS,
    initialFormData,
    open,
  );

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '공정 수정' : '공정 추가'}</h2>
      <form onSubmit={(e) => handleSubmit(e, onSubmit, onClose)} className="space-y-4">
        <FormInput label="단계" type="number" min={1} value={form.step} onChange={(e) => setForm({ ...form, step: Number(e.target.value) })} required />
        <FormInput label="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="채토 (採土)" required />
        <FormInput label="간단 설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="산지에서 원토를 채굴" required />
        <div>
          <label className="text-sm font-medium block mb-1">상세 설명</label>
          <textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : initial ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const ARTIST_DEFAULTS: CreateArtistData = {
  name: '',
  title: '',
  region: '',
  story: '',
  specialty: '',
  imageUrl: '',
  productUrl: '',
  isActive: true,
};

function toArtistFormData(a: Artist): CreateArtistData {
  return {
    name: a.name,
    title: a.title,
    region: a.region,
    story: a.story,
    specialty: a.specialty,
    imageUrl: a.imageUrl ?? '',
    productUrl: a.productUrl,
    isActive: a.isActive,
  };
}

function ArtistFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateArtistData) => Promise<void>;
  initial?: Artist | null;
}) {
  const initialFormData = useMemo(() => (initial ? toArtistFormData(initial) : null), [initial]);
  const { formData: form, setFormData: setForm, loading, handleSubmit } = useFormModal<CreateArtistData>(
    ARTIST_DEFAULTS,
    initialFormData,
    open,
  );

  return (
    <Modal isOpen={open} onClose={onClose} maxWidth="md">
      <h2 className="text-lg font-semibold mb-4">{initial ? '아티스트 수정' : '아티스트 추가'}</h2>
      <form onSubmit={(e) => handleSubmit(e, onSubmit, onClose)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="진위명 (陳偉明)" required />
          <FormInput label="타이틀" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="국가급 공예미술사" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="지역" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="장쑤성 이싱" required />
          <FormInput label="전문" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="이중 니층 석표식" required />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">사진</label>
          <ProductImageUploader imageUrl={form.imageUrl ?? ''} onChange={(url) => setForm({ ...form, imageUrl: url })} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">스토리</label>
          <textarea value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" required />
        </div>
        <FormInput label="상품 URL" value={form.productUrl} onChange={(e) => setForm({ ...form, productUrl: e.target.value })} placeholder="/products?artist=chen-weiming" required />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="artistIsActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
          <label htmlFor="artistIsActive" className="text-sm">활성 상태</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={loading}>{loading ? '저장 중...' : initial ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminArchivesPage() {
  const { isLoading: authLoading, isAdmin } = useAdminGuard();
  const [tab, setTab] = useState<Tab>('nilo');
  const [niloTypes, setNiloTypes] = useState<NiloType[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [niloModalOpen, setNiloModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [artistModalOpen, setArtistModalOpen] = useState(false);

  const [editNilo, setEditNilo] = useState<NiloType | null>(null);
  const [editProcess, setEditProcess] = useState<ProcessStep | null>(null);
  const [editArtist, setEditArtist] = useState<Artist | null>(null);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  const { execute: loadData, isLoading: loading } = useAsyncAction(
    async () => {
      const [nilos, processes, artistsData] = await Promise.all([
        adminArchivesApi.getNiloTypes(),
        adminArchivesApi.getProcessSteps(),
        adminArchivesApi.getArtists(),
      ]);
      setNiloTypes(nilos);
      setProcessSteps(processes);
      setArtists(artistsData);
    },
    { errorMessage: '데이터를 불러오지 못했습니다.' },
  );

  useEffect(() => {
    if (isAdmin) {
      void loadData();
    }
  }, [isAdmin, loadData]);

  const handleNiloSubmit = async (data: CreateNiloTypeData) => {
    if (editNilo) {
      await adminArchivesApi.updateNiloType(editNilo.id, data);
      toast.success('니로타입이 수정되었습니다.');
    } else {
      await adminArchivesApi.createNiloType(data);
      toast.success('니로타입이 추가되었습니다.');
    }
    await loadData();
  };

  const handleProcessSubmit = async (data: CreateProcessStepData) => {
    if (editProcess) {
      await adminArchivesApi.updateProcessStep(editProcess.id, data);
      toast.success('공정이 수정되었습니다.');
    } else {
      await adminArchivesApi.createProcessStep(data);
      toast.success('공정이 추가되었습니다.');
    }
    await loadData();
  };

  const handleArtistSubmit = async (data: CreateArtistData) => {
    if (editArtist) {
      await adminArchivesApi.updateArtist(editArtist.id, data);
      toast.success('아티스트가 수정되었습니다.');
    } else {
      await adminArchivesApi.createArtist(data);
      toast.success('아티스트가 추가되었습니다.');
    }
    await loadData();
  };

  const { execute: deleteNilo } = useAsyncAction(
    async (item: NiloType) => {
      await adminArchivesApi.deleteNiloType(item.id);
      await loadData();
    },
    { successMessage: '삭제되었습니다.', errorMessage: '삭제 실패' },
  );

  const { execute: deleteProcess } = useAsyncAction(
    async (item: ProcessStep) => {
      await adminArchivesApi.deleteProcessStep(item.id);
      await loadData();
    },
    { successMessage: '삭제되었습니다.', errorMessage: '삭제 실패' },
  );

  const { execute: deleteArtist } = useAsyncAction(
    async (item: Artist) => {
      await adminArchivesApi.deleteArtist(item.id);
      await loadData();
    },
    { successMessage: '삭제되었습니다.', errorMessage: '삭제 실패' },
  );

  const handleDeleteNilo = (item: NiloType) => {
    if (!window.confirm(`"${item.nameKo}" 니로타입을 삭제하시겠습니까?`)) return;
    void deleteNilo(item);
  };

  const handleDeleteProcess = (item: ProcessStep) => {
    if (!window.confirm(`"${item.title}" 공정을 삭제하시겠습니까?`)) return;
    void deleteProcess(item);
  };

  const handleDeleteArtist = (item: Artist) => {
    if (!window.confirm(`"${item.name}" 아티스트를 삭제하시겠습니까?`)) return;
    void deleteArtist(item);
  };

  // Drag handlers for NiloType
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
    setActiveTab(tab);
  };

  const { execute: handleNiloReorder } = useAsyncAction(
    async ({ activeId, overId }: { activeId: number; overId: number }) => {
      if (activeId === overId) return;
      const activeIndex = niloTypes.findIndex((n) => n.id === activeId);
      const overIndex = niloTypes.findIndex((n) => n.id === overId);
      if (activeIndex === -1 || overIndex === -1) return;

      const reordered = [...niloTypes];
      const [removed] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, removed);

      const orders = reordered.map((n, idx) => ({ id: n.id, sortOrder: idx }));
      await adminArchivesApi.reorderNiloTypes(orders);
      await loadData();
    },
    { errorMessage: '순서 변경에 실패했습니다.' },
  );

  const { execute: handleArtistReorder } = useAsyncAction(
    async ({ activeId, overId }: { activeId: number; overId: number }) => {
      if (activeId === overId) return;
      const activeIndex = artists.findIndex((a) => a.id === activeId);
      const overIndex = artists.findIndex((a) => a.id === overId);
      if (activeIndex === -1 || overIndex === -1) return;

      const reordered = [...artists];
      const [removed] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, removed);

      const orders = reordered.map((a, idx) => ({ id: a.id, sortOrder: idx }));
      await adminArchivesApi.reorderArtists(orders);
      await loadData();
    },
    { errorMessage: '순서 변경에 실패했습니다.' },
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTab(null);

    if (over && active.id !== over.id) {
      if (tab === 'nilo') {
        void handleNiloReorder({ activeId: active.id as number, overId: over.id as number });
      } else if (tab === 'artist') {
        void handleArtistReorder({ activeId: active.id as number, overId: over.id as number });
      }
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'nilo', label: '니로타입' },
    { key: 'process', label: '공정' },
    { key: 'artist', label: '아티스트' },
  ];

  const sortedNiloTypes = [...niloTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedArtists = [...artists].sort((a, b) => a.sortOrder - b.sortOrder);

  const activeItem = activeId
    ? activeTab === 'nilo'
      ? niloTypes.find((n) => n.id === activeId)
      : activeTab === 'artist'
        ? artists.find((a) => a.id === activeId)
        : null
    : null;

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonBox height="h-8 w-48" />
        <SkeletonBox height="h-12 w-full" />
        <SkeletonBox height="h-64 w-full" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">아카이브 관리</h1>
        </div>

        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'nilo' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setEditNilo(null); setNiloModalOpen(true); }} className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">
                + 니로타입 추가
              </button>
            </div>
            <AdminTable
              columns={[
                { label: '', width: 'w-12' },
                { label: '색상', width: 'w-16' },
                { label: '이름' },
                { label: '원문' },
                { label: '산지' },
                { label: '상태', width: 'w-20' },
                { label: '작업', width: 'w-36' },
              ]}
              isEmpty={sortedNiloTypes.length === 0}
              emptyMessage="데이터가 없습니다."
            >
              <SortableContext items={sortedNiloTypes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                {sortedNiloTypes.map((n) => (
                  <SortableNiloTypeRow key={n.id} item={n} onEdit={(n) => { setEditNilo(n); setNiloModalOpen(true); }} onDelete={handleDeleteNilo} />
                ))}
              </SortableContext>
            </AdminTable>
          </div>
        )}

        {tab === 'process' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setEditProcess(null); setProcessModalOpen(true); }} className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">
                + 공정 추가
              </button>
            </div>
            <AdminTable
              columns={[
                { label: '단계', width: 'w-16' },
                { label: '제목' },
                { label: '설명' },
                { label: '작업', width: 'w-36' },
              ]}
              isEmpty={processSteps.length === 0}
              emptyMessage="데이터가 없습니다."
            >
              {processSteps.map((p) => (
                <ProcessStepRow key={p.id} item={p} onEdit={(p) => { setEditProcess(p); setProcessModalOpen(true); }} onDelete={handleDeleteProcess} />
              ))}
            </AdminTable>
          </div>
        )}

        {tab === 'artist' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setEditArtist(null); setArtistModalOpen(true); }} className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">
                + 아티스트 추가
              </button>
            </div>
            <AdminTable
              columns={[
                { label: '', width: 'w-12' },
                { label: '이미지', width: 'w-16' },
                { label: '이름' },
                { label: '타이틀' },
                { label: '지역' },
                { label: '상태', width: 'w-20' },
                { label: '작업', width: 'w-36' },
              ]}
              isEmpty={sortedArtists.length === 0}
              emptyMessage="데이터가 없습니다."
            >
              <SortableContext items={sortedArtists.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                {sortedArtists.map((a) => (
                  <SortableArtistRow key={a.id} item={a} onEdit={(a) => { setEditArtist(a); setArtistModalOpen(true); }} onDelete={handleDeleteArtist} />
                ))}
              </SortableContext>
            </AdminTable>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeItem ? (
          <table className="w-full text-sm">
            <tbody>
              <tr className="shadow-lg ring-2 ring-primary bg-background rounded-lg">
                <td className="py-3 px-4"><GripVertical className="h-4 w-4 text-muted-foreground" /></td>
                {activeTab === 'nilo' && (
                  <>
                    <td className="py-3 px-4"><span className="inline-block w-6 h-6 rounded" style={{ backgroundColor: (activeItem as NiloType).color }} /></td>
                    <td className="py-3 px-4 font-medium">{(activeItem as NiloType).nameKo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{(activeItem as NiloType).name}</td>
                  </>
                )}
                {activeTab === 'artist' && (
                  <>
                    <td className="py-3 px-4">
                      {(activeItem as Artist).imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(activeItem as Artist).imageUrl!} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">{(activeItem as Artist).name.slice(0, 1)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">{(activeItem as Artist).name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{(activeItem as Artist).title}</td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        ) : null}
      </DragOverlay>

      <NiloTypeFormModal open={niloModalOpen} onClose={() => setNiloModalOpen(false)} onSubmit={handleNiloSubmit} initial={editNilo} />
      <ProcessStepFormModal open={processModalOpen} onClose={() => setProcessModalOpen(false)} onSubmit={handleProcessSubmit} initial={editProcess} />
      <ArtistFormModal open={artistModalOpen} onClose={() => setArtistModalOpen(false)} onSubmit={handleArtistSubmit} initial={editArtist} />
    </DndContext>
  );
}
