import { useRef, useState, useEffect } from 'react'
import ModelAccordion from './ModelAccordion'

export default function DropZone({
  file,
  onChange,
  modelId,
  onModelChange,
  onReportIssue,
}) {

    const [isDragging, setIsDragging] = useState(false)
    const [preview, setPreview] = useState(null)
    const inputRef = useRef(null)

    // create or revoke the URL for the preview when the file changes
    useEffect(() => {
        if (!file) {
            setPreview(null)
            return
        }

        const isImage = file.type.startsWith('image/')
            if (!isImage) {
            setPreview(null)
            return
        }

        const url = URL.createObjectURL(file)
        setPreview(url)

        // clean memory when file is deleted or changed 
        return () => URL.revokeObjectURL(url)
    }, [file])

    const handleClick = () => {
        inputRef.current?.click()
    }

    const handleInputChange = (e) => {
        const picked = e.target.files?.[0]
            if (picked) onChange(picked)
            // resetting the value so that the same file can be selected again
            e.target.value = ''
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)

        const dropped = e.dataTransfer.files?.[0]
        if (dropped) onChange(dropped)
    }

    const clearFile = (e) => {
        e.stopPropagation() // block handleClick
        onChange(null)
    }

      return (
    <div className="w-full max-w-2xl flex flex-col gap-3">

      {/* main drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full h-[420px] rounded-3xl
          border-2 border-dashed
          flex flex-col items-center justify-center
          cursor-pointer transition-all
          ${
            isDragging
              ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
              : 'border-white/20 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.05]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,.zip"
          onChange={handleInputChange}
          className="hidden"
        />

        {file ? (
          <div className="w-full h-full p-6 flex flex-col items-center justify-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt={file.name}
                className="max-h-[260px] max-w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                </svg>
              </div>
            )}

            <div className="text-center">
              <div className="text-white text-sm font-medium truncate max-w-xs">
                {file.name}
              </div>
              <div className="text-white/40 text-xs mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs hover:bg-white/20 transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center px-6 pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm">Drag & drop photo or archive here</p>
              <p className="text-white/40 text-xs mt-1">or click to browse</p>
            </div>
            <p className="text-white/30 text-xs">png, jpeg, jpg & zip</p>
          </div>
        )}
      </div>

      {/* bottom block: accordeon + Model was wrong */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ModelAccordion
            value={modelId}
            onChange={onModelChange}
            disabled={!file}
          />
        </div>

        <button
          type="button"
          onClick={onReportIssue}
          disabled={!file}
          className="shrink-0 px-5 py-3 rounded-2xl bg-white/5 border border-white/15 text-white/80 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Model was wrong?
        </button>
      </div>
    </div>
  )

}