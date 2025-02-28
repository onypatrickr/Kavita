import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeriesCardComponent } from './series-card/series-card.component';
import { LibraryCardComponent } from './library-card/library-card.component';
import { CoverImageChooserComponent } from './cover-image-chooser/cover-image-chooser.component';
import { EditSeriesModalComponent } from './_modals/edit-series-modal/edit-series-modal.component';
import { EditCollectionTagsComponent } from './_modals/edit-collection-tags/edit-collection-tags.component';
import { BookmarksModalComponent } from './_modals/bookmarks-modal/bookmarks-modal.component';
import { NgbTooltipModule, NgbCollapseModule, NgbPaginationModule, NgbDropdownModule, NgbProgressbarModule, NgbNavModule, NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';
import { CardActionablesComponent } from './card-item/card-actionables/card-actionables.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxFileDropModule } from 'ngx-file-drop';
import { CardItemComponent } from './card-item/card-item.component';
import { SharedModule } from '../shared/shared.module';
import { RouterModule } from '@angular/router';
import { TypeaheadModule } from '../typeahead/typeahead.module';
import { CardDetailLayoutComponent } from './card-detail-layout/card-detail-layout.component';
import { CardDetailsModalComponent } from './_modals/card-details-modal/card-details-modal.component';
import { BulkOperationsComponent } from './bulk-operations/bulk-operations.component';
import { BulkAddToCollectionComponent } from './_modals/bulk-add-to-collection/bulk-add-to-collection.component';
import { PipeModule } from '../pipe/pipe.module';
import { ChapterMetadataDetailComponent } from './chapter-metadata-detail/chapter-metadata-detail.component';
import { FileInfoComponent } from './file-info/file-info.component';
import { BookmarkComponent } from './bookmark/bookmark.component';
import { MetadataFilterModule } from '../metadata-filter/metadata-filter.module';



@NgModule({
  declarations: [
    CardItemComponent,
    SeriesCardComponent,
    LibraryCardComponent,
    CoverImageChooserComponent,
    EditSeriesModalComponent,
    EditCollectionTagsComponent,
    BookmarksModalComponent,
    CardActionablesComponent,
    CardDetailLayoutComponent,
    CardDetailsModalComponent,
    BulkOperationsComponent,
    BulkAddToCollectionComponent,
    ChapterMetadataDetailComponent,
    FileInfoComponent,
    BookmarkComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule, // EditCollectionsModal
    
    PipeModule,
    SharedModule,
    TypeaheadModule, // edit series modal

    MetadataFilterModule,
    
    NgbNavModule,
    NgbTooltipModule, // Card item
    NgbCollapseModule,
    NgbRatingModule,



    NgbNavModule, //Series Detail
    NgbPaginationModule, // CardDetailLayoutComponent
    NgbDropdownModule,
    NgbProgressbarModule,
    NgxFileDropModule, // Cover Chooser
    PipeModule // filter for BulkAddToCollectionComponent
  ],
  exports: [
    CardItemComponent,
    SeriesCardComponent,
    LibraryCardComponent,
    SeriesCardComponent,
    LibraryCardComponent,
    CoverImageChooserComponent,
    EditSeriesModalComponent,
    EditCollectionTagsComponent,
    BookmarksModalComponent,
    CardActionablesComponent,
    CardDetailLayoutComponent,
    CardDetailsModalComponent,
    BulkOperationsComponent,
    ChapterMetadataDetailComponent
  ]
})
export class CardsModule { }
