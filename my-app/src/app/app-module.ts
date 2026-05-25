import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';

// Import our subcomponents
import { ProgressTrackerComponent } from './components/progress-tracker/progress-tracker.component';
import { MultipleChoiceComponent } from './components/multiple-choice/multiple-choice.component';
import { WrittenInputComponent } from './components/written-input/written-input.component';
import { CompletionScreenComponent } from './components/completion-screen/completion-screen.component';
import { ImportModalComponent } from './components/import-modal/import-modal.component';
import { PhaseTransitionComponent } from './components/phase-transition/phase-transition.component';

// Lucide Icons Import
import {
  LucideAngularModule,
  Sun,
  Moon,
  BookOpen,
  Settings,
  Zap,
  ArrowRight,
  RotateCcw,
  Layers,
  Brain,
  Upload,
  ClipboardPaste,
  X,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Trophy,
  Sparkles,
  CornerDownLeft,
  Pencil,
  Star,
  Home
} from 'lucide-angular';

@NgModule({
  declarations: [
    App,
    ProgressTrackerComponent,
    MultipleChoiceComponent,
    WrittenInputComponent,
    CompletionScreenComponent,
    ImportModalComponent,
    PhaseTransitionComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    LucideAngularModule.pick({
      Sun,
      Moon,
      BookOpen,
      Settings,
      Zap,
      ArrowRight,
      RotateCcw,
      Layers,
      Brain,
      Upload,
      ClipboardPaste,
      X,
      FileJson,
      AlertCircle,
      CheckCircle2,
      Trash2,
      HelpCircle,
      Trophy,
      Sparkles,
      CornerDownLeft,
      Pencil,
      Star,
      Home
    })
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
