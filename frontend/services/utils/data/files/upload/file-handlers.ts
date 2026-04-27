export type FileType = "csv" | "duckdb" | "sqlite" | ""

export interface FileInfo {
  file: File
  rows?: number
  columns?: number
}

/**
 * Returns the file extension string corresponding to a given internal FileType.
 * Useful for filtering inputs in native file chooser dialogs.
 * 
 * @param {FileType} fileType - The internal file representation type
 * @returns {string} The corresponding standard file extension modifier (e.g. '.csv')
 */
export const getAcceptedFileTypes = (fileType: FileType): string => {
    switch (fileType) {
      case "csv":
        return ".csv"
      case "duckdb":
        return ".duckdb"
      case "sqlite":
        return ".sqlite"
      default:
        return ""
    }
  }
  
/**
 * Checks if a standard File object matches the expected internal FileType.
 * 
 * @param {File} file - The file to be validated
 * @param {FileType} fileType - The internal app file type we are checking against
 * @returns {boolean} True if the extension matches, false otherwise
 */
export const isFileTypeValid = (file: File, fileType: FileType): boolean => {
    const extension = file.name.toLowerCase().split('.').pop()
    return extension === fileType
  }
  
/**
 * Basic CSV parser that calculates row and column counts from a raw text string.
 * This is primarily intended as a fast preview parsing rather than a robust full-scale parser.
 * 
 * @param {string} text - The raw CSV blob content to parse
 * @returns {{ rows: number; columns: number }} Estimates of the rows and columns
 */
export const parseCSV = (text: string): { rows: number; columns: number } => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { rows: 0, columns: 0 }
  
    const firstLine = lines[0]
    const columns = firstLine.split(',').length
    const rows = lines.length - 1
  
    return { rows, columns }
  }

  import { toast } from "sonner"

/**
 * Core validation cycle for handling uploaded files. Validates file constraints (size, types),
 * optionally executes a lightweight parsing for metrics (e.g. rows/columns for CSVs),
 * and notifies the user via Toast on success or failure.
 * 
 * @param {FileList} files - The collection of files dropped or selected by the user
 * @param {FileType} fileType - The expected file type constraints
 * @returns {Promise<FileInfo[]>} Returns the cleanly separated valid files equipped with parsed info
 */
export const handleFiles = async (
  files: FileList,
  fileType: FileType
): Promise<FileInfo[]> => {
  const MAX_SIZE_MB = 200
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

  const validFiles = Array.from(files).filter(file => {
    const isValidType = isFileTypeValid(file, fileType)
    const isValidSize = file.size <= MAX_SIZE_BYTES

    if (!isValidType) {
      toast.error("Invalid File Type 🚫", {
        description: `Only ${fileType.toUpperCase()} files are allowed`,
      })
    } else if (!isValidSize) {
      toast.warning("File Too Large 📦", {
        description: `${file.name} exceeds the 200MB size limit`,
      })
    }

    return isValidType && isValidSize
  })

  const newFileInfos: FileInfo[] = []

  for (const file of validFiles) {
    const fileInfo: FileInfo = { file }

    if (fileType === "csv") {
      try {
        const text = await file.text()
        const { rows, columns } = parseCSV(text)
        fileInfo.rows = rows
        fileInfo.columns = columns
      } catch (error) {
        console.error("Error parsing CSV:", error)
      }
    }

    newFileInfos.push(fileInfo)
  }

  if (newFileInfos.length > 0) {
    toast("Files Added 📑", {
      description: `Added ${newFileInfos.length} file(s) to upload queue`,
    })
  }

  return newFileInfos
}
