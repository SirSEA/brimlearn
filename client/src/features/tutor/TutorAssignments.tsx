import {
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Sparkles,
  Target,
  Upload,
  User,
  Users,
  Users2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Assignment,
  type AssignmentDifficulty,
  type AssignmentType,
  type CreateAssignmentInput,
} from "@/_core/api";
import { publishAssignment } from "@/lib/assignmentStore";
import { Pagination } from "@/components/ui/Pagination";

type Audience = "class" | "group" | "individual";
type TeacherType = AssignmentType;
type AssignmentItem = {
  id: string;
  type: TeacherType;
  title: string;
  subject: string;
  audience: string;
  difficulty: AssignmentDifficulty;
  due: string;
  status: "Scheduled" | "In review";
};

const levels: AssignmentDifficulty[] = ["Easy", "Medium", "Hard", "Advanced"];

const learnerDefaults: Record<string, AssignmentDifficulty> = {
  "Amara Okafor": "Easy",
  "Leo Mensah": "Medium",
  "Zuri Campbell": "Advanced",
  "Tunde Bakare": "Advanced",
  "Nneka Eze": "Medium",
};

const defaultAssignments: AssignmentItem[] = [
  {
    id: "a1",
    type: "Quiz",
    title: "Fractions check-in",
    subject: "Mathematics",
    audience: "Whole class",
    difficulty: "Easy",
    due: "Wed · 6pm",
    status: "Scheduled",
  },
  {
    id: "a2",
    type: "Lesson",
    title: "Perimeter vs area · visual lab",
    subject: "Mathematics",
    audience: "Zuri + 2 more",
    difficulty: "Medium",
    due: "Thu · 9am",
    status: "In review",
  },
];

const WORKSHEET_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};
const WORKSHEET_EXTS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "doc",
  "docx",
];
const MAX_WORKSHEET_BYTES = 5 * 1024 * 1024;

const allToNames = (audience: Audience, selected: string[]) => {
  if (audience === "class") return Object.keys(learnerDefaults);
  if (audience === "group") return ["Amara Okafor", "Leo Mensah", "Nneka Eze"];
  return selected;
};

function toItem(assignment: Assignment): AssignmentItem {
  return {
    id: assignment.id,
    type: assignment.type,
    title: assignment.title,
    subject: assignment.subject,
    audience: assignment.audience,
    difficulty: assignment.difficulty,
    due:
      assignment.due && assignment.due.trim().length > 0
        ? assignment.due.replace(/^Due\s+/i, "")
        : "No due date",
    status: assignment.status,
  };
}

/** "2026-09-27" → "Sun, 27 Sep"; anything else passes through untouched. */
function formatDueLabel(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });

export function TutorAssignments() {
  const [type, setType] = useState<TeacherType>("Worksheet");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [audience, setAudience] = useState<Audience>("class");
  const [selected, setSelected] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<AssignmentDifficulty>("Medium");
  const [due, setDue] = useState(todayIso());
  const [worksheetFile, setWorksheetFile] = useState<{
    name: string;
    url: string;
    size: number;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [assignments, setAssignments] =
    useState<AssignmentItem[]>(defaultAssignments);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .listAssignments()
      .then((list) => {
        if (list.length > 0) setAssignments(list.map(toItem));
      })
      .catch(() => {
        // Offline demo — keep the local defaults.
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const previewLearners = allToNames(audience, selected);

  const totalPages = Math.max(1, Math.ceil(assignments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = assignments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pickWorksheet = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!WORKSHEET_EXTS.includes(ext) && !WORKSHEET_TYPES[file.type]) {
      toast.error("Please choose a PDF, image or Word document.");
      return;
    }
    if (file.size > MAX_WORKSHEET_BYTES) {
      toast.error("Worksheet is too large (5MB max).");
      return;
    }
    setUploadingFile(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const result = await api.uploadChatFile({
        fileName: file.name,
        mimeType: file.type || `application/${ext}`,
        dataBase64,
        type: "file",
      });
      setWorksheetFile({
        name: result.fileName,
        url: result.url,
        size: result.fileSize,
      });
      toast.success(
        "Worksheet uploaded — it will be attached when you assign.",
      );
    } catch {
      toast.error(
        "Could not upload the worksheet. Make sure the server is running, then try again.",
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const assign = async () => {
    if (!title.trim()) {
      toast("Give the assignment a title first.");
      return;
    }
    if (type === "Worksheet" && !worksheetFile) {
      toast("Attach the worksheet file first.");
      return;
    }
    const isWorksheet = type === "Worksheet";
    const audienceLabel =
      audience === "class"
        ? "Whole class"
        : audience === "group"
          ? `Group (${previewLearners.length})`
          : selected.join(", ");
    const isPractice = type === "Practice";
    const dueLabel = isPractice ? "" : formatDueLabel(due);
    const assignedDue = isPractice ? "No due date" : dueLabel || "No due date";

    const input: CreateAssignmentInput = {
      type,
      title: title.trim(),
      subject,
      audience: audienceLabel,
      audienceKey: audience,
      learnerIds: audience === "individual" ? selected : [],
      difficulty,
      due: isPractice ? null : dueLabel || null,
      fileUrl: isWorksheet ? (worksheetFile?.url ?? null) : null,
      fileName: isWorksheet ? (worksheetFile?.name ?? null) : null,
      fileSize: isWorksheet ? (worksheetFile?.size ?? null) : null,
    };

    try {
      const created = await api.createAssignment(input);
      setAssignments((current) => [
        toItem(created),
        ...current.filter((item) => !item.id.startsWith("a")),
      ]);
      toast.success(
        isPractice
          ? `${type} pushed to learners — practice, no deadline. It now appears in their Tracker.`
          : `${type} assigned to ${audienceLabel} — saved to the class, learners see it in their Tracker.`,
      );
    } catch {
      publishAssignment({
        title: input.title,
        subject,
        audience: audienceLabel,
        difficulty,
        due: isPractice ? null : dueLabel || null,
      });
      setAssignments((current) => [
        {
          id: `pub-${Date.now()}`,
          type,
          title: input.title,
          subject,
          audience: audienceLabel,
          difficulty,
          due: assignedDue,
          status: "Scheduled",
        },
        ...current,
      ]);
      toast.success(
        isPractice
          ? `${type} pushed locally (offline demo) — it will sync when the backend is reachable.`
          : `${type} saved locally (offline demo) — it will sync when the backend is reachable.`,
      );
    }
    setTitle("");
    setWorksheetFile(null);
  };

  const switchType = (item: TeacherType) => {
    setType(item);
    if (item === "Practice") setDue("");
    else if (!due) setDue(todayIso());
    setWorksheetFile(null);
  };

  return (
    <>
      <section className="rounded-[27px] bg-[#3B241A] p-7 text-white shadow-[0_18px_40px_rgba(59,36,26,.14)] sm:p-9">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[#FFC857]">
            <ClipboardList size={13} /> Assignment studio
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.06em] sm:text-[40px]">
            Assign work that fits each learner.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#D9C4B0]">
            Worksheets, quizzes, and lessons — sent to the whole class, a group,
            or one learner, tuned to their understanding.
          </p>
        </div>
      </section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
            Create assignment
          </div>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em] text-[#1A1512]">
            What are you assigning?
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["Worksheet", "Quiz", "Lesson", "Practice"] as TeacherType[]).map(
              (item) => {
                const Icon =
                  item === "Worksheet"
                    ? FileText
                    : item === "Quiz"
                      ? Sparkles
                      : item === "Lesson"
                        ? GraduationCap
                        : Target;
                return (
                  <button
                    key={item}
                    onClick={() => switchType(item)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${type === item ? "border-[#4B6B3C] bg-[#E9EED9]" : "border-[#F3E9DE] bg-[#FFFDF8] hover:border-[#C8B3A0]"}`}
                  >
                    <Icon
                      size={18}
                      className={
                        type === item ? "text-[#4B6B3C]" : "text-[#8A7361]"
                      }
                    />
                    <span className="text-sm font-semibold text-[#3B241A]">
                      {item}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-[#765F4F]">
              Title
              <span className="mt-1.5 block">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    type === "Worksheet"
                      ? "e.g. Multiplying by 10s · worksheet"
                      : "e.g. Multiplying by 10s"
                  }
                  className="w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70]"
                />
              </span>
            </label>
            <label className="text-xs font-semibold text-[#765F4F]">
              Subject
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A]"
              >
                <option>Mathematics</option>
                <option>English Studies</option>
                <option>Basic Science</option>
                <option>Social Studies</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-[#765F4F]">
              Due date
              {type === "Practice" && (
                <span className="ml-1.5 rounded bg-[#EFE8FC] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#8B78C7]">
                  practice · no deadline
                </span>
              )}
              <input
                type="date"
                value={due}
                disabled={type === "Practice"}
                onChange={(event) => setDue(event.target.value)}
                className={`mt-1.5 w-full rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3 py-2.5 text-xs font-semibold text-[#3B241A] outline-none focus:border-[#8CAE70] ${type === "Practice" ? "opacity-50" : ""}`}
              />
            </label>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-[#765F4F]">
              Who is it for?
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["class", "Whole class", Users],
                  ["group", "Group", Users2],
                  ["individual", "Individual", User],
                ] as Array<[Audience, string, typeof Users]>
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setAudience(key)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${audience === key ? "border-[#4B6B3C] bg-[#E9EED9] text-[#4B6B3C]" : "border-[#E2CDB8] text-[#765F4F] hover:bg-[#F7EFE3]"}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {audience === "individual" && (
            <div className="mt-4 rounded-2xl bg-[#F7EFE3] p-4">
              <div className="text-xs font-semibold text-[#765F4F]">
                Choose a learner
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(learnerDefaults).map((learner) => (
                  <button
                    key={learner}
                    onClick={() =>
                      setSelected((current) =>
                        current.includes(learner) ? [] : [learner],
                      )
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${selected.includes(learner) ? "bg-[#C65A2E] text-white" : "bg-[#FFFDF8] text-[#765F4F] shadow-sm hover:bg-[#EFEFDD]"}`}
                  >
                    {learner}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === "Worksheet" ? (
            <div className="mt-6 rounded-2xl border border-[#E5D8F5] bg-[#FBF8FF] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#765F4F]">
                <Paperclip size={14} className="text-[#8B78C7]" /> Worksheet
                file
              </div>
              <p className="mt-1 text-xs text-[#A08A75]">
                PDF, image or Word doc (max 5MB). Learners open the file
                straight from their Tracker.
              </p>
              {worksheetFile ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#E2CDB8] bg-[#FFFDF8] px-3.5 py-2.5">
                  {worksheetFile.url.endsWith(".pdf") ? (
                    <FileText size={18} className="shrink-0 text-[#C65A2E]" />
                  ) : (
                    <ImageIcon size={18} className="shrink-0 text-[#C65A2E]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#3B241A]">
                      {worksheetFile.name}
                    </div>
                    <div className="text-[10px] text-[#A08A75]">
                      {formatFileSize(worksheetFile.size)} · ready to assign
                    </div>
                  </div>
                  <a
                    href={worksheetFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[#EFE8FC] px-2.5 py-1.5 text-[10px] font-bold text-[#8B78C7] hover:bg-[#E4D9F7]"
                  >
                    View
                  </a>
                  <button
                    onClick={() => setWorksheetFile(null)}
                    aria-label="Remove worksheet file"
                    className="rounded-lg p-1.5 text-[#A08A75] transition hover:bg-[#F7EFE3] hover:text-[#C65A2E]"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#CBA9E8] bg-[#FFFDF8] px-4 py-6 text-center transition hover:border-[#8B78C7]">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,application/pdf,image/*"
                    onChange={(event) => pickWorksheet(event.target.files?.[0])}
                    className="hidden"
                  />
                  {uploadingFile ? (
                    <Loader2
                      size={20}
                      className="animate-spin text-[#8B78C7]"
                    />
                  ) : (
                    <Upload size={20} className="text-[#8B78C7]" />
                  )}
                  <span className="text-xs font-semibold text-[#765F4F]">
                    {uploadingFile ? "Uploading…" : "Click to choose a file"}
                  </span>
                  <span className="text-[10px] text-[#A08A75]">
                    PDF · PNG/JPG · Word
                  </span>
                </label>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[#F3E9DE] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#765F4F]">
                <Sparkles size={14} className="text-[#8B78C7]" /> Challenge
                level
              </div>
              <p className="mt-1 text-xs text-[#A08A75]">
                BrimLearn differentiates the questions for each learner — this
                is the cap so nobody is pushed past their understanding.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${difficulty === level ? "bg-[#8B78C7] text-white" : "bg-[#F7EFE3] text-[#765F4F] hover:bg-[#EFEFDD]"}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={assign}
            className="mt-6 w-full rounded-full bg-[#C65A2E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#A84A22] sm:w-auto sm:px-6"
          >
            Assign {type.toLowerCase()}
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
              Assignment preview
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.05em] text-[#1A1512]">
              {type === "Worksheet"
                ? "Who gets this worksheet."
                : "How each learner gets this."}
            </h2>
            <div className="mt-4 space-y-2.5">
              {previewLearners.map((learner) => (
                <div
                  key={learner}
                  className="flex items-center justify-between rounded-xl bg-[#F7EFE3] p-3"
                >
                  <span className="text-sm font-semibold text-[#3B241A]">
                    {learner}
                  </span>
                  {type === "Worksheet" ? (
                    <span className="rounded-full bg-[#EFE8FC] px-2.5 py-1 text-[10px] font-bold text-[#8B78C7] shadow-sm">
                      opens the file
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#FFFDF8] px-2.5 py-1 text-[10px] font-bold text-[#8B78C7] shadow-sm">
                      {learnerDefaults[learner]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[27px] border border-[#E2CDB8] bg-[#FFFDF8] p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A08A75]">
                Recent assignments
              </div>
              <span className="rounded-full bg-[#F7EFE3] px-3 py-1.5 text-xs font-semibold text-[#765F4F]">
                {loading ? "…" : assignments.length}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {pageItems.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-[#F3E9DE] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#3B241A]">
                        {assignment.title}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#A08A75]">
                        {assignment.type} · {assignment.subject} ·{" "}
                        {assignment.audience}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${assignment.status === "Scheduled" ? "bg-[#E9EED9] text-[#4B6B3C]" : "bg-[#FFF1CD] text-[#9A6712]"}`}
                    >
                      {assignment.status}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] text-[#A08A75]">
                    <CheckCircle2 size={12} className="text-[#4B6B3C]" />{" "}
                    {assignment.difficulty} cap
                    {assignment.due === "No due date" ? (
                      <span className="rounded bg-[#EFE8FC] px-1.5 py-0.5 font-bold text-[#8B78C7]">
                        no due date
                      </span>
                    ) : (
                      <span>due {assignment.due}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!loading && assignments.length === 0 && (
              <div className="mt-3 rounded-2xl bg-[#F7EFE3] p-5 text-center text-sm text-[#8A7361]">
                No assignments yet. Create one above and it will show up here
                and on every learner’s Tracker.
              </div>
            )}
            {!loading && assignments.length > 0 && (
              <Pagination page={currentPage} pageSize={pageSize} total={assignments.length} onPageChange={setPage} className="mt-5" />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
