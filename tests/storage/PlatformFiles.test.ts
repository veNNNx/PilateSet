import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  readJsonFile as readNative,
  writeJsonFile as writeNative,
  getJsonFileLocation as nativeLocation,
} from "../../constants/jsonFileStorage.native";
import { exportJson as exportNative } from "../../constants/jsonExport.native";
import { readPickedJson as readNativePicked } from "../../constants/readPickedJson.native";
import {
  readJsonFile as readWeb,
  writeJsonFile as writeWeb,
  getJsonFileLocation as webLocation,
} from "../../constants/jsonFileStorage.web";
import { exportJson as exportWeb } from "../../constants/jsonExport.web";
import { readPickedJson as readWebPicked } from "../../constants/readPickedJson.web";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const instances: {
    uri: string;
    create: jest.Mock;
    text: jest.Mock;
    write: jest.Mock;
  }[] = [];
  class MockFile {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri =
        parts.length === 1 && typeof parts[0] === "string"
          ? parts[0]
          : `file://${parts.map((part) => (typeof part === "object" && part !== null && "uri" in part ? (part as { uri: string }).uri : String(part))).join("/")}`;
      instances.push(this as never);
    }
    get exists() {
      return files.has(this.uri);
    }
    create = jest.fn(() => {
      if (!files.has(this.uri)) files.set(this.uri, "");
    });
    text = jest.fn(async () => files.get(this.uri) ?? "");
    write = jest.fn(async (value: string) => {
      files.set(this.uri, value);
    });
  }
  return {
    File: MockFile,
    Paths: { document: { uri: "documents" }, cache: { uri: "cache" } },
    __files: files,
    __instances: instances,
  };
});
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const fsMock = jest.requireMock<any>("expo-file-system") as {
  __files: Map<string, string>;
  __instances: unknown[];
};
const sharingMock = jest.requireMock<any>("expo-sharing") as {
  isAvailableAsync: jest.Mock;
  shareAsync: jest.Mock;
};

beforeEach(() => {
  fsMock.__files.clear();
  fsMock.__instances.length = 0;
  jest.clearAllMocks();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  jest.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
  sharingMock.isAvailableAsync.mockResolvedValue(true);
  sharingMock.shareAsync.mockResolvedValue(undefined);
});

describe("native file persistence", () => {
  it("reads existing files before legacy storage and migrates legacy values once", async () => {
    fsMock.__files.set("file://documents/existing.json", "file-value");
    await expect(readNative("existing.json", "legacy")).resolves.toBe(
      "file-value",
    );
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();

    jest.mocked(AsyncStorage.getItem).mockResolvedValue("legacy-value");
    await expect(readNative("migrated.json", "old-key")).resolves.toBe(
      "legacy-value",
    );
    expect(fsMock.__files.get("file://documents/migrated.json")).toBe(
      "legacy-value",
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("old-key");
  });

  it("initializes absent data, writes through files, and reports file location", async () => {
    await expect(readNative("new.json", "new-key")).resolves.toBe("[]");
    await writeNative("new.json", "new-key", '{"ok":true}');
    expect(fsMock.__files.get("file://documents/new.json")).toBe('{"ok":true}');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("new-key");
    expect(nativeLocation("new.json", "key")).toBe("file://documents/new.json");
  });

  it("exports pretty JSON via sharing and reports unsupported sharing", async () => {
    await exportNative("backup.json", { ok: true });
    expect(fsMock.__files.get("file://cache/backup.json")).toBe(
      JSON.stringify({ ok: true }, null, 2),
    );
    expect(sharingMock.shareAsync).toHaveBeenCalledWith(
      "file://cache/backup.json",
      expect.objectContaining({
        mimeType: "application/json",
        dialogTitle: "Eksportuj backup.json",
      }),
    );
    sharingMock.isAvailableAsync.mockResolvedValue(false);
    await expect(exportNative("backup.json", {})).rejects.toThrow(
      "Udostępnianie plików nie jest dostępne na tym urządzeniu.",
    );
  });

  it("reads a selected native file", async () => {
    fsMock.__files.set("file://picked.json", '{"imported":true}');
    await expect(
      readNativePicked({ uri: "file://picked.json" } as never),
    ).resolves.toBe('{"imported":true}');
  });
});

describe("web persistence and picked files", () => {
  it("uses the storage key on web and exposes its location", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue("saved");
    await expect(readWeb("ignored.json", "web-key")).resolves.toBe("saved");
    await writeWeb("ignored.json", "web-key", "new");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("web-key", "new");
    expect(webLocation("x.json", "web-key")).toBe("localStorage (web-key)");
  });

  it("reads an in-browser file and rejects assets without a File handle", async () => {
    const asset = { file: { text: jest.fn().mockResolvedValue("json") } };
    await expect(readWebPicked(asset as never)).resolves.toBe("json");
    expect(() => readWebPicked({ file: null } as never)).toThrow(
      "Nie można odczytać wybranego pliku w przeglądarce.",
    );
  });

  it("downloads a JSON blob and revokes its object URL", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalDocument = globalThis.document;
    URL.createObjectURL = jest.fn(() => "blob:test");
    URL.revokeObjectURL = jest.fn();
    const link = {
      href: "",
      download: "",
      click: jest.fn(),
      remove: jest.fn(),
    };
    const append = jest.fn();
    const createElement = jest.fn(() => link);
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { body: { append }, createElement },
    });
    jest.useFakeTimers();
    await exportWeb("backup.json", { ok: true });
    expect(createElement).toHaveBeenCalledWith("a");
    expect(link.download).toBe("backup.json");
    expect(link.click).toHaveBeenCalled();
    expect(link.remove).toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(link);
    jest.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    jest.useRealTimers();
    if (originalDocument)
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    else Reflect.deleteProperty(globalThis, "document");
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
