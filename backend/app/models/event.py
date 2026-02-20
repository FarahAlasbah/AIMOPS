"""
File: backend/app/models/event.py
Purpose: Events and impact analysis models
"""
from sqlalchemy import Column, Integer, String, Date, Boolean, DECIMAL, TIMESTAMP, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    #   Primary Key  
    event_id = Column(Integer, primary_key=True, autoincrement=True)

    #   Event Info  
    event_name = Column(String(200), nullable=False)
    #English name of event

    event_name_ar = Column(String(200), nullable=True)
    #Arabic name (optional)

    event_type = Column(
        Enum(
            'religious',     # Ramadan, Eid, Christmas
            'national',      # National Day, Independence Day
            'seasonal',      # Summer, Back to School
            'local',         # Local festival, regional event
            'business',      # New shipment, price change
            'promotional',   # Flash sale, bundle deal
            'custom',        # Anything else user wants
            name='event_type_enum'
        ),
        nullable=False,
        default='custom'
    )

    #   Date Range  
    start_date = Column(Date, nullable=False)
    # What: When event starts

    end_date = Column(Date, nullable=False)
    # What: When event ends

    #   Description  
    description = Column(Text, nullable=True)
    # What: Optional free text notes

    #   Recurring Settings  
    is_recurring = Column(Boolean, default=False)
    # What: Does this event happen again next year?

    recurrence_type = Column(
        Enum(
            'yearly',    # Ramadan, National Day
            'monthly',   # Monthly stock clearance
            'one_time',  # One-off event
            name='recurrence_type_enum'
        ),
        nullable=True,
        default='one_time'
    )

    #   Status  
    status = Column(
        Enum(
            'draft',      # Auto-created by reminder system, needs confirmation
            'confirmed',  # User confirmed this event
            name='event_status_enum'
        ),
        nullable=False,
        default='confirmed'
    )
    #repeated events need to be confirmed

    #   Audit  
    created_by = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    updated_by = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    deleted_at = Column(TIMESTAMP, nullable=True)

    #   Relationships  
    impact_results = relationship(
        "EventImpactResult",
        back_populates="event",
        cascade="all, delete-orphan"
    )
    # WHY cascade delete:
    # If event deleted → its impact results deleted too
    # No orphan impact results floating around

    def __repr__(self):
        return f"<Event {self.event_id}: {self.event_name}>"


class EventImpactResult(Base):
    __tablename__ = "event_impact_results"

    #   Primary Key  
    impact_id = Column(Integer, primary_key=True, autoincrement=True)

    #   Foreign Keys  
    event_id = Column(
        Integer,
        ForeignKey('events.event_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    product_id = Column(
        Integer,
        ForeignKey('products.product_id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    #   Baseline Period  
    baseline_period_start = Column(Date, nullable=False)
    baseline_period_end = Column(Date, nullable=False)
    # What: The 30 days BEFORE the event
    # Used to calculate "normal" sales for comparison
    # Example: If Ramadan = Feb 28, baseline = Jan 29 - Feb 27

    #   Sales Averages  
    baseline_daily_avg = Column(DECIMAL(10, 2), nullable=False)
    # What: Average daily sales BEFORE event
    # Example: 30.00 units/day in January

    during_daily_avg = Column(DECIMAL(10, 2), nullable=False)
    # What: Average daily sales DURING event
    # Example: 55.00 units/day during Ramadan

    #   Impact  
    change_percentage = Column(DECIMAL(10, 2), nullable=False)
    # What: How much sales changed during event vs baseline
    # Formula: ((during - baseline) / baseline) * 100
    # Example: ((55 - 30) / 30) * 100 = 83.33%

    impact_level = Column(
        Enum(
            'low',        # 10-15% change
            'medium',     # 15-30% change
            'high',       # 30-50% change
            'very_high',  # 50%+ change
            name='impact_level_enum'
        ),
        nullable=False
    )

    baseline_data_quality = Column(
        Enum(
            'high_confidence',  # Product existed throughout baseline period
            'low_confidence',   # Product existed partially in baseline
            'event_only',       # Product only appeared during event
            name='baseline_quality_enum'
        ),
        nullable=False,
        default='high_confidence'
    )
    
    #   Metadata  
    calculated_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    # What: When was this analysis run

    #   Relationships  
    event = relationship("Event", back_populates="impact_results")
    product = relationship("Product")

    def __repr__(self):
        return f"<EventImpactResult Event:{self.event_id} Product:{self.product_id} {self.change_percentage}%>"