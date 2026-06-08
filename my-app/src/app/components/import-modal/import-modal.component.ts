import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';

interface SeparatorOption {
  label: string;
  value: string;
}

interface ParsedEntry {
  term: string;
  definition: string;
  synonym?: string;
  ipa?: string;
}

@Component({
  selector: 'app-import-modal',
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.css'],
  standalone: false
})
export class ImportModalComponent {
  @Input() isOpen = false;
  @Input() currentCount = 0;
  @Input() bundledCount = 0;

  @Output() close = new EventEmitter<void>();
  @Output() import = new EventEmitter<ParsedEntry[]>();
  @Output() syncFromFile = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  activeTab: 'paste' | 'file' = 'paste';
  pasteText: string = '';
  separator: string = '\t';
  error: string = '';
  preview: ParsedEntry[] = [];

  separatorOptions: SeparatorOption[] = [
    { label: 'Tab', value: '\t' },
    { label: 'Comma (,)', value: ',' },
    { label: 'Semicolon (;)', value: ';' },
    { label: 'Colon (:)', value: ':' },
    { label: 'Dash (-)', value: ' - ' }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  handleClose() {
    this.close.emit();
    this.cdr.detectChanges();
  }

  setTab(tab: 'paste' | 'file') {
    this.activeTab = tab;
    this.error = '';
    this.cdr.detectChanges();
  }

  parseText(text: string, sep: string) {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed: ParsedEntry[] = [];
    const errors: number[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(sep);
      if (parts.length >= 3) {
        parsed.push({
          term: parts[0].trim(),
          definition: parts[1].trim(),
          synonym: parts.slice(2).join(sep).trim()
        });
      } else if (parts.length >= 2) {
        parsed.push({
          term: parts[0].trim(),
          definition: parts.slice(1).join(sep).trim()
        });
      } else {
        errors.push(idx + 1);
      }
    });

    return { parsed, errors };
  }

  handlePasteChange(text: string) {
    this.pasteText = text;
    this.error = '';
    if (text.trim()) {
      const { parsed, errors } = this.parseText(text, this.separator);
      this.preview = parsed.slice(0, 5);
      if (errors.length > 0) {
        this.error = `Could not parse line(s): ${errors.join(', ')}. Make sure each line has a term and definition separated by your chosen separator.`;
      }
    } else {
      this.preview = [];
    }
    this.cdr.detectChanges();
  }

  handleSeparatorChange(sep: string) {
    this.separator = sep;
    if (this.pasteText.trim()) {
      const { parsed, errors } = this.parseText(this.pasteText, sep);
      this.preview = parsed.slice(0, 5);
      if (errors.length > 0) {
        this.error = `Could not parse line(s): ${errors.join(', ')}`;
      } else {
        this.error = '';
      }
    }
    this.cdr.detectChanges();
  }

  getParsedCount(): number {
    return this.parseText(this.pasteText, this.separator).parsed.length;
  }

  handlePasteImport() {
    const { parsed, errors } = this.parseText(this.pasteText, this.separator);
    if (parsed.length === 0) {
      this.error = 'No valid entries found. Please check your text and separator.';
      this.cdr.detectChanges();
      return;
    }
    this.import.emit(parsed);
    this.pasteText = '';
    this.preview = [];
    this.error = '';
    this.handleClose();
    this.cdr.detectChanges();
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error = '';
    this.cdr.detectChanges();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          this.error = 'JSON file must contain an array of objects.';
          this.cdr.detectChanges();
          return;
        }
        const valid = data.filter(
          (item: { term?: string; definition?: string; synonym?: string; ipa?: string }) =>
            item.term && item.definition
        );
        if (valid.length === 0) {
          this.error = 'No valid entries found. Each object needs "term" and "definition" fields.';
          this.cdr.detectChanges();
          return;
        }
        this.import.emit(valid);
        this.handleClose();
      } catch (err) {
        this.error = 'Invalid JSON file. Please check the format.';
      }
      this.cdr.detectChanges();
    };
    reader.readAsText(file);
    input.value = '';
    this.cdr.detectChanges();
  }

  handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.handleClose();
    }
  }
}
