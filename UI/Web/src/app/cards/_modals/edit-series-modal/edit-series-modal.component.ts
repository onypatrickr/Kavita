import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Breakpoint, UtilityService } from 'src/app/shared/_services/utility.service';
import { TypeaheadSettings } from 'src/app/typeahead/typeahead-settings';
import { Chapter } from 'src/app/_models/chapter';
import { CollectionTag } from 'src/app/_models/collection-tag';
import { Genre } from 'src/app/_models/genre';
import { AgeRatingDto } from 'src/app/_models/metadata/age-rating-dto';
import { Language } from 'src/app/_models/metadata/language';
import { PublicationStatusDto } from 'src/app/_models/metadata/publication-status-dto';
import { Person, PersonRole } from 'src/app/_models/person';
import { Series } from 'src/app/_models/series';
import { SeriesMetadata } from 'src/app/_models/series-metadata';
import { Tag } from 'src/app/_models/tag';
import { CollectionTagService } from 'src/app/_services/collection-tag.service';
import { ImageService } from 'src/app/_services/image.service';
import { LibraryService } from 'src/app/_services/library.service';
import { MetadataService } from 'src/app/_services/metadata.service';
import { SeriesService } from 'src/app/_services/series.service';
import { UploadService } from 'src/app/_services/upload.service';

@Component({
  selector: 'app-edit-series-modal',
  templateUrl: './edit-series-modal.component.html',
  styleUrls: ['./edit-series-modal.component.scss']
})
export class EditSeriesModalComponent implements OnInit, OnDestroy {

  @Input() series!: Series;
  seriesVolumes: any[] = [];
  isLoadingVolumes = false;
  /**
   * A copy of the series from init. This is used to compare values for name fields to see if lock was modified
   */
  initSeries!: Series;

  isCollapsed = true;
  volumeCollapsed: any = {};
  tabs = ['General', 'Metadata', 'People', 'Cover Image', 'Info'];
  active = this.tabs[0];
  editSeriesForm!: FormGroup;
  libraryName: string | undefined = undefined;
  private readonly onDestroy = new Subject<void>();


  // Typeaheads
  ageRatingSettings: TypeaheadSettings<AgeRatingDto> = new TypeaheadSettings();
  publicationStatusSettings: TypeaheadSettings<PublicationStatusDto> = new TypeaheadSettings();
  tagsSettings: TypeaheadSettings<Tag> = new TypeaheadSettings();
  languageSettings: TypeaheadSettings<Language> = new TypeaheadSettings();
  peopleSettings: {[PersonRole: string]: TypeaheadSettings<Person>} = {};
  collectionTagSettings: TypeaheadSettings<CollectionTag> = new TypeaheadSettings();
  genreSettings: TypeaheadSettings<Genre> = new TypeaheadSettings();


  collectionTags: CollectionTag[] = [];
  tags: Tag[] = [];
  genres: Genre[] = [];

  metadata!: SeriesMetadata;
  imageUrls: Array<string> = [];
  /**
   * Selected Cover for uploading
   */
  selectedCover: string = '';

  ageRatings: Array<AgeRatingDto> = [];
  publicationStatuses: Array<PublicationStatusDto> = [];
  validLanguages: Array<Language> = [];

  coverImageReset = false;

  get Breakpoint(): typeof Breakpoint {
    return Breakpoint;
  }

  get PersonRole() {
    return PersonRole;
  }

  getPersonsSettings(role: PersonRole) {
    return this.peopleSettings[role];
  }

  constructor(public modal: NgbActiveModal,
              private seriesService: SeriesService,
              public utilityService: UtilityService,
              private fb: FormBuilder,
              public imageService: ImageService,
              private libraryService: LibraryService,
              private collectionService: CollectionTagService,
              private uploadService: UploadService,
              private metadataService: MetadataService) { }

  ngOnInit(): void {
    this.imageUrls.push(this.imageService.getSeriesCoverImage(this.series.id));

    this.libraryService.getLibraryNames().pipe(takeUntil(this.onDestroy)).subscribe(names => {
      this.libraryName = names[this.series.libraryId];
    });
    
    this.initSeries = Object.assign({}, this.series);


    this.editSeriesForm = this.fb.group({
      id: new FormControl(this.series.id, []),
      summary: new FormControl('', []),
      name: new FormControl(this.series.name, []),
      localizedName: new FormControl(this.series.localizedName, []),
      sortName: new FormControl(this.series.sortName, []),
      rating: new FormControl(this.series.userRating, []),

      coverImageIndex: new FormControl(0, []),
      coverImageLocked: new FormControl(this.series.coverImageLocked, []),

      ageRating: new FormControl('', []),
      publicationStatus: new FormControl('', []),
      language: new FormControl('', []),
    });


    this.metadataService.getAllAgeRatings().subscribe(ratings => {
      this.ageRatings = ratings;
    });

    this.metadataService.getAllPublicationStatus().subscribe(statuses => {
      this.publicationStatuses = statuses;
    });

    this.metadataService.getAllValidLanguages().subscribe(validLanguages => {
      this.validLanguages = validLanguages;
    })

    this.seriesService.getMetadata(this.series.id).subscribe(metadata => {
      if (metadata) {
        this.metadata = metadata;

        this.setupTypeaheads();
        this.editSeriesForm.get('summary')?.patchValue(this.metadata.summary);
        this.editSeriesForm.get('ageRating')?.patchValue(this.metadata.ageRating);
        this.editSeriesForm.get('publicationStatus')?.patchValue(this.metadata.publicationStatus);
        this.editSeriesForm.get('language')?.patchValue(this.metadata.language);

        this.editSeriesForm.get('name')?.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(val => {
          this.series.nameLocked = true;
        });

        this.editSeriesForm.get('sortName')?.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(val => {
          this.series.sortNameLocked = true;
        });

        this.editSeriesForm.get('localizedName')?.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(val => {
          this.series.localizedNameLocked = true;
        });

        this.editSeriesForm.get('summary')?.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(val => {
          this.metadata.summaryLocked = true;
          this.metadata.summary = val;
        });


        this.editSeriesForm.get('ageRating')?.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(val => {
          this.metadata.ageRating = parseInt(val + '', 10);
          this.metadata.ageRatingLocked = true;
        });

        this.editSeriesForm.get('publicationStatus')?.valueChanges.pipe(takeUntil(this.onDestroy)).subscribe(val => {
          this.metadata.publicationStatus = parseInt(val + '', 10);
          this.metadata.publicationStatusLocked = true;
        });
      }
    });

    this.isLoadingVolumes = true;
    this.seriesService.getVolumes(this.series.id).subscribe(volumes => {
      this.seriesVolumes = volumes;
      this.isLoadingVolumes = false;

      volumes.forEach(v => {
        this.volumeCollapsed[v.name] = true;
      });
      this.seriesVolumes.forEach(vol => {
        vol.volumeFiles = vol.chapters?.sort(this.utilityService.sortChapters).map((c: Chapter) => c.files.map((f: any) => {
          f.chapter = c.number;
          return f;
        })).flat();
      });
    });
  }

  ngOnDestroy() {
    this.onDestroy.next();
    this.onDestroy.complete();
  }

  setupTypeaheads() {
    forkJoin([
      this.setupCollectionTagsSettings(),
      this.setupTagSettings(),
      this.setupGenreTypeahead(),
      this.setupPersonTypeahead(),
      this.setupLanguageTypeahead()
    ]).subscribe(results => {
      this.collectionTags = this.metadata.collectionTags;
    });
  }

  setupCollectionTagsSettings() {
    this.collectionTagSettings.minCharacters = 0;
    this.collectionTagSettings.multiple = true;
    this.collectionTagSettings.id = 'collections';
    this.collectionTagSettings.unique = true;
    this.collectionTagSettings.addIfNonExisting = true;
    this.collectionTagSettings.fetchFn = (filter: string) => this.fetchCollectionTags(filter).pipe(map(items => this.collectionTagSettings.compareFn(items, filter)));
    this.collectionTagSettings.addTransformFn = ((title: string) => {
      return {id: 0, title: title, promoted: false, coverImage: '', summary: '', coverImageLocked: false };
    });
    this.collectionTagSettings.compareFn = (options: CollectionTag[], filter: string) => {
      // console.log('compareFN:')
      // console.log('options: ', options);
      // console.log('filter: ', filter);
      // console.log('results: ', options.filter(m => this.utilityService.filter(m.title, filter)));
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.collectionTagSettings.selectionCompareFn = (a: CollectionTag, b: CollectionTag) => {
      return a.title === b.title;
    }

    if (this.metadata.collectionTags) {
      this.collectionTagSettings.savedData = this.metadata.collectionTags;
    }

    return of(true);
  }

  setupTagSettings() {
    this.tagsSettings.minCharacters = 0;
    this.tagsSettings.multiple = true;
    this.tagsSettings.id = 'tags';
    this.tagsSettings.unique = true;
    this.tagsSettings.showLocked = true;
    this.tagsSettings.addIfNonExisting = true;


    this.tagsSettings.compareFn = (options: Tag[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.tagsSettings.fetchFn = (filter: string) => this.metadataService.getAllTags()
      .pipe(map(items => this.tagsSettings.compareFn(items, filter)));

    this.tagsSettings.addTransformFn = ((title: string) => {
      return {id: 0, title: title };
    });
    this.tagsSettings.selectionCompareFn = (a: Tag, b: Tag) => {
      return a.id == b.id;
    }

    if (this.metadata.tags) {
      this.tagsSettings.savedData = this.metadata.tags;
    }
    return of(true);
  }

  setupGenreTypeahead() {
    this.genreSettings.minCharacters = 0;
    this.genreSettings.multiple = true;
    this.genreSettings.id = 'genres';
    this.genreSettings.unique = true;
    this.genreSettings.showLocked = true;
    this.genreSettings.addIfNonExisting = true;
    this.genreSettings.fetchFn = (filter: string) => {
      return this.metadataService.getAllGenres()
      .pipe(map(items => this.genreSettings.compareFn(items, filter)));
    };
    this.genreSettings.compareFn = (options: Genre[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.genreSettings.selectionCompareFn = (a: Genre, b: Genre) => {
      return a.title == b.title;
    }

    this.genreSettings.addTransformFn = ((title: string) => {
      return {id: 0, title: title };
    });

    if (this.metadata.genres) {
      this.genreSettings.savedData = this.metadata.genres;
    }
    return of(true);
  }

  updateFromPreset(id: string, presetField: Array<Person> | undefined, role: PersonRole) {
    const personSettings = this.createBlankPersonSettings(id, role)
    if (presetField && presetField.length > 0) {
      const fetch = personSettings.fetchFn as ((filter: string) => Observable<Person[]>);
      return fetch('').pipe(map(people => {
        const persetIds = presetField.map(p => p.id);
        personSettings.savedData = people.filter(person => persetIds.includes(person.id));
        this.peopleSettings[role] = personSettings;
        this.updatePerson(personSettings.savedData as Person[], role);
        return true;
      }));
    } else {
      this.peopleSettings[role] = personSettings;
      return of(true);
    }
  }

  setupLanguageTypeahead() {
    this.languageSettings.minCharacters = 0;
    this.languageSettings.multiple = false;
    this.languageSettings.id = 'language';
    this.languageSettings.unique = true;
    this.languageSettings.showLocked = true;
    this.languageSettings.addIfNonExisting = false;
    this.languageSettings.compareFn = (options: Language[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.title, filter));
    }
    this.languageSettings.fetchFn = (filter: string) => of(this.validLanguages)
      .pipe(map(items => this.languageSettings.compareFn(items, filter)));

    this.languageSettings.selectionCompareFn = (a: Language, b: Language) => {
      return a.isoCode == b.isoCode;
    }

    if (this.metadata.language) {
      const l = this.validLanguages.find(l => l.isoCode === this.metadata.language);
      if (l !== undefined) {
        this.languageSettings.savedData = l;
      }
    }
    return of(true);
  }

  setupPersonTypeahead() {
    this.peopleSettings = {};

    return forkJoin([
      this.updateFromPreset('writer', this.metadata.writers, PersonRole.Writer),
      this.updateFromPreset('character', this.metadata.characters, PersonRole.Character),
      this.updateFromPreset('colorist', this.metadata.colorists, PersonRole.Colorist),
      this.updateFromPreset('cover-artist', this.metadata.coverArtists, PersonRole.CoverArtist),
      this.updateFromPreset('editor', this.metadata.editors, PersonRole.Editor),
      this.updateFromPreset('inker', this.metadata.inkers, PersonRole.Inker),
      this.updateFromPreset('letterer', this.metadata.letterers, PersonRole.Letterer),
      this.updateFromPreset('penciller', this.metadata.pencillers, PersonRole.Penciller),
      this.updateFromPreset('publisher', this.metadata.publishers, PersonRole.Publisher),
      this.updateFromPreset('translator', this.metadata.translators, PersonRole.Translator)
    ]).pipe(map(results => {
      return of(true);
    }));
  }

  fetchPeople(role: PersonRole, filter: string) {
    return this.metadataService.getAllPeople().pipe(map(people => {
      return people.filter(p => p.role == role && this.utilityService.filter(p.name, filter));
    }));
  }

  createBlankPersonSettings(id: string, role: PersonRole) {
    var personSettings = new TypeaheadSettings<Person>();
    personSettings.minCharacters = 0;
    personSettings.multiple = true;
    personSettings.showLocked = true;
    personSettings.unique = true;
    personSettings.addIfNonExisting = true;
    personSettings.id = id;
    personSettings.compareFn = (options: Person[], filter: string) => {
      return options.filter(m => this.utilityService.filter(m.name, filter));
    }

    personSettings.selectionCompareFn = (a: Person, b: Person) => {
      return a.name == b.name && a.role == b.role;
    }
    personSettings.fetchFn = (filter: string) => {
      return this.fetchPeople(role, filter).pipe(map(items => personSettings.compareFn(items, filter)));
    };

    personSettings.addTransformFn = ((title: string) => {
      return {id: 0, name: title, role: role };
    });

    return personSettings;
  }

  close() {
    this.modal.close({success: false, series: undefined});
  }

  fetchCollectionTags(filter: string = '') {
    return this.collectionService.search(filter);
  }

  formatChapterNumber(chapter: Chapter) {
    if (chapter.number === '0') {
      return '1';
    }
    return chapter.number;
  }

  save() {
    const model = this.editSeriesForm.value;
    const selectedIndex = this.editSeriesForm.get('coverImageIndex')?.value || 0;

    const apis = [
      this.seriesService.updateMetadata(this.metadata, this.collectionTags)
    ];

    // We only need to call updateSeries if we changed name, sort name, or localized name or reset a cover image
    const nameFieldsDirty = this.editSeriesForm.get('name')?.dirty || this.editSeriesForm.get('sortName')?.dirty || this.editSeriesForm.get('localizedName')?.dirty;
    const nameFieldLockChanged = this.series.nameLocked !== this.initSeries.nameLocked || this.series.sortNameLocked !== this.initSeries.sortNameLocked || this.series.localizedNameLocked !== this.initSeries.localizedNameLocked;
    if (nameFieldsDirty || nameFieldLockChanged || this.coverImageReset) {
      model.nameLocked = this.series.nameLocked;
      model.sortNameLocked = this.series.sortNameLocked;
      model.localizedNameLocked = this.series.localizedNameLocked;
      apis.push(this.seriesService.updateSeries(model));
    }


    if (selectedIndex > 0 && this.selectedCover !== '') {
      apis.push(this.uploadService.updateSeriesCoverImage(model.id, this.selectedCover));
    }


    forkJoin(apis).subscribe(results => {
      this.modal.close({success: true, series: model, coverImageUpdate: selectedIndex > 0});
    });
  }

  updateCollections(tags: CollectionTag[]) {
    this.collectionTags = tags;
  }

  updateTags(tags: Tag[]) {
    this.tags = tags;
    this.metadata.tags = tags;
  }

  updateGenres(genres: Genre[]) {
    this.genres = genres;
    this.metadata.genres = genres;
  }

  updateLanguage(language: Language) {
    this.metadata.language = language.isoCode;
  }

  updatePerson(persons: Person[], role: PersonRole) {
    switch (role) {
      case PersonRole.CoverArtist:
        this.metadata.coverArtists = persons;
        break;
      case PersonRole.Character:
        this.metadata.characters = persons;
        break;
      case PersonRole.Colorist:
        this.metadata.colorists = persons;
        break;
      case PersonRole.Editor:
        this.metadata.editors = persons;
        break;
      case PersonRole.Inker:
        this.metadata.inkers = persons;
        break;
      case PersonRole.Letterer:
        this.metadata.letterers = persons;
        break;
      case PersonRole.Penciller:
        this.metadata.pencillers = persons;
        break;
      case PersonRole.Publisher:
        this.metadata.publishers = persons;
        break;
      case PersonRole.Writer:
        this.metadata.writers = persons;
        break;
      case PersonRole.Translator:
        this.metadata.translators = persons;

    }
  }

  updateSelectedIndex(index: number) {
    this.editSeriesForm.patchValue({
      coverImageIndex: index
    });
  }

  updateSelectedImage(url: string) {
    this.selectedCover = url;
  }

  handleReset() {
    this.coverImageReset = true;
    this.editSeriesForm.patchValue({
      coverImageLocked: false
    });
  }

  unlock(b: any, field: string) {
    if (b) {
      b[field] = !b[field];
    }
  }

}
