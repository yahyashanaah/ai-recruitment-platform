from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator, Sequence

from sqlalchemy import Float, JSON, String, create_engine, delete, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    """Base SQLAlchemy model class."""


class CandidateORM(Base):
    """Structured candidate profile persisted in SQLite."""

    __tablename__ = "candidate_profiles_single_tenant"

    candidate_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255))

    name: Mapped[str] = mapped_column(String(255), default="Unknown")
    phone_number: Mapped[str] = mapped_column(String(255), default="")
    gmail: Mapped[str] = mapped_column(String(255), default="")
    location: Mapped[str] = mapped_column(String(255), default="")
    years_of_experience: Mapped[float] = mapped_column(Float, default=0)

    skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    education: Mapped[str] = mapped_column(String(255), default="")
    current_position: Mapped[str] = mapped_column(String(255), default="")
    notice_period: Mapped[str] = mapped_column(String(255), default="")
    certifications: Mapped[list[str]] = mapped_column(JSON, default=list)

    raw_profile: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class CandidateRepository:
    """Repository for all candidate profile persistence operations."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    @contextmanager
    def _session_scope(self) -> Iterator[Session]:
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_candidate(
        self,
        candidate_id: str,
        file_name: str,
        profile: dict[str, Any],
    ) -> CandidateORM:
        candidate = CandidateORM(
            candidate_id=candidate_id,
            file_name=file_name,
            name=str(profile.get("name") or "Unknown"),
            phone_number=str(profile.get("phone_number") or ""),
            gmail=str(profile.get("gmail") or ""),
            location=str(profile.get("location") or ""),
            years_of_experience=float(profile.get("years_of_experience") or 0),
            skills=self._normalize_list(profile.get("skills")),
            education=str(profile.get("education") or ""),
            current_position=str(profile.get("current_position") or ""),
            notice_period="",
            certifications=self._normalize_list(profile.get("certifications")),
            raw_profile=profile,
        )

        with self._session_scope() as session:
            session.add(candidate)
            session.flush()
            session.refresh(candidate)
            return candidate

    def get_all_candidates(self) -> list[CandidateORM]:
        with self._session_scope() as session:
            statement = (
                select(CandidateORM)
                .order_by(CandidateORM.name.asc())
            )
            return list(session.scalars(statement).all())

    def get_candidates_by_ids(self, candidate_ids: Sequence[str]) -> list[CandidateORM]:
        if not candidate_ids:
            return []

        with self._session_scope() as session:
            statement = select(CandidateORM).where(
                CandidateORM.candidate_id.in_(list(candidate_ids)),
            )
            rows = list(session.scalars(statement).all())
            by_id = {row.candidate_id: row for row in rows}
            return [by_id[cid] for cid in candidate_ids if cid in by_id]

    def get_candidate_ids_by_file_name(self, file_name: str) -> list[str]:
        with self._session_scope() as session:
            statement = select(CandidateORM.candidate_id).where(CandidateORM.file_name == file_name)
            return list(session.scalars(statement).all())

    def delete_candidate(self, candidate_id: str) -> bool:
        with self._session_scope() as session:
            statement = delete(CandidateORM).where(
                CandidateORM.candidate_id == candidate_id,
            )
            result = session.execute(statement)
            return bool(result.rowcount and result.rowcount > 0)

    def delete_candidates_by_file_name(self, file_name: str) -> int:
        with self._session_scope() as session:
            statement = delete(CandidateORM).where(CandidateORM.file_name == file_name)
            result = session.execute(statement)
            return int(result.rowcount or 0)

    @staticmethod
    def _normalize_list(value: Any) -> list[str]:
        if isinstance(value, list):
            cleaned = [str(item).strip() for item in value if str(item).strip()]
            seen: set[str] = set()
            deduped: list[str] = []
            for item in cleaned:
                key = item.lower()
                if key in seen:
                    continue
                seen.add(key)
                deduped.append(item)
            return deduped

        if isinstance(value, str) and value.strip():
            return [value.strip()]

        return []


def init_db(sqlite_url: str) -> sessionmaker[Session]:
    """Initialize SQLite engine and create tables."""
    connect_args = {"check_same_thread": False} if sqlite_url.startswith("sqlite") else {}
    engine = create_engine(sqlite_url, connect_args=connect_args)
    Base.metadata.create_all(engine)
    _migrate_sqlite_candidate_columns(engine=engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def _migrate_sqlite_candidate_columns(engine) -> None:
    """Ensure newly introduced candidate columns exist in SQLite."""
    if engine.dialect.name != "sqlite":
        return

    required_columns = {
        "phone_number": "VARCHAR(255) DEFAULT ''",
        "gmail": "VARCHAR(255) DEFAULT ''",
    }

    with engine.begin() as connection:
        rows = connection.exec_driver_sql(
            f"PRAGMA table_info({CandidateORM.__tablename__})",
        ).fetchall()
        existing = {str(row[1]) for row in rows}

        for column_name, column_ddl in required_columns.items():
            if column_name in existing:
                continue
            connection.exec_driver_sql(
                f"ALTER TABLE {CandidateORM.__tablename__} "
                f"ADD COLUMN {column_name} {column_ddl}",
            )
